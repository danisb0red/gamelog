import type { MetadataRoute } from "next";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { games, lists } from "@/lib/db/schema";
import { gameProvider } from "@/lib/games";
import { loadReleases } from "@/lib/games/releases";
import { addDays, shiftMonth, todayUtc } from "@/lib/releases";
import { absoluteUrl } from "@/lib/site";

// Regenerated at most hourly. Without this, a route that only touches the
// database and a fetch cache would be frozen at whatever the build saw.
export const revalidate = 3600;

const MAX_GAMES = 5000; // the protocol allows 50,000 URLs; this is well inside it
const MAX_LISTS = 1000;

/** Each source is independent: one failing costs its URLs, not the sitemap. */
async function safely<T>(label: string, fn: () => Promise<T[]>): Promise<T[]> {
  try {
    return await fn();
  } catch (err) {
    console.error(`[sitemap] ${label} failed:`, err);
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const today = todayUtc();
  const month = today.slice(0, 7);

  const [dbGames, upcoming, popular, publicLists] = await Promise.all([
    safely("db games", () =>
      db
        .select({ slug: games.slug, syncedAt: games.syncedAt })
        .from(games)
        .orderBy(desc(games.syncedAt))
        .limit(MAX_GAMES),
    ),
    safely("releases", async () => (await loadReleases(today, addDays(today, 60))).entries.map((e) => e.game.slug)),
    safely("popular", async () => (await gameProvider.getPopularGames(40)).map((g) => g.slug)),
    safely("lists", () =>
      db
        .select({ id: lists.id, updatedAt: lists.updatedAt })
        .from(lists)
        .where(eq(lists.isPublic, true))
        .orderBy(desc(lists.updatedAt))
        .limit(MAX_LISTS),
    ),
  ]);

  const seen = new Set<string>();
  const gameEntries: MetadataRoute.Sitemap = [];
  const addGame = (slug: string | null | undefined, lastModified?: Date) => {
    if (!slug || seen.has(slug)) return;
    seen.add(slug);
    gameEntries.push({ url: absoluteUrl(`/g/${slug}`), lastModified, changeFrequency: "weekly", priority: 0.7 });
  };
  // Games people are looking at now first, so a truncated crawl gets the best.
  popular.forEach((s) => addGame(s));
  upcoming.forEach((s) => addGame(s));
  dbGames.forEach((g) => addGame(g.slug, g.syncedAt));

  return [
    { url: absoluteUrl("/"), changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/privacy"), changeFrequency: "yearly", priority: 0.2 },
    ...[0, 1, 2, 3].map((n) => ({
      // The canonical form (see the releases page), so /releases itself isn't listed twice.
      url: absoluteUrl(`/releases?month=${shiftMonth(month, n)}`),
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ...gameEntries,
    ...publicLists.map((l) => ({
      url: absoluteUrl(`/list/${l.id}`),
      lastModified: l.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    })),
  ];
}
