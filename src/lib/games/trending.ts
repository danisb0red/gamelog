import "server-only";
import { gameProvider } from "./index";
import type { GameSummary } from "./types";

/**
 * "Trending now" = Steam's live most-played chart (ranked by concurrent
 * players). Steam tells us *what* is being played right now; we then map each
 * title to our own game data (via the active provider) so cards link to our
 * game pages. PC/Steam-only by nature — no console exclusives.
 *
 * No API key required. If anything fails, callers should fall back to the
 * provider's all-time popular list.
 */

const MOST_PLAYED_URL =
  "https://api.steampowered.com/ISteamChartsService/GetMostPlayedGames/v1/";

/** Resolve a Steam appid to its game name. */
async function steamAppName(appid: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://store.steampowered.com/api/appdetails?appids=${appid}&filters=basic`,
      { next: { revalidate: 60 * 60 * 24 } }, // names are stable
    );
    if (!res.ok) return null;
    const data = (await res.json()) as Record<
      string,
      { success: boolean; data?: { name?: string } }
    >;
    const entry = data[String(appid)];
    return entry?.success ? (entry.data?.name ?? null) : null;
  } catch {
    return null;
  }
}

/** Strip trademark noise that hurts title matching. */
function cleanName(name: string): string {
  return name.replace(/[™®©]/g, "").trim();
}

export async function getTrendingGames(limit = 10): Promise<GameSummary[]> {
  const res = await fetch(MOST_PLAYED_URL, { next: { revalidate: 60 * 60 } }); // refresh hourly
  if (!res.ok) throw new Error(`Steam most-played failed: ${res.status}`);

  const data = (await res.json()) as {
    response?: { ranks?: { appid: number; rank: number }[] };
  };
  const ranks = (data.response?.ranks ?? []).slice(0, limit + 10); // over-fetch for misses

  // Steam appid -> name, in rank order.
  const names = await Promise.all(ranks.map((r) => steamAppName(r.appid)));

  // Map each name to our game data via the active provider (RAWG), preserving
  // Steam's ranking. Run lookups in parallel; both layers are fetch-cached.
  const matches = await Promise.all(
    names.map((n) => (n ? gameProvider.searchGames(cleanName(n), 1) : Promise.resolve([]))),
  );

  const seen = new Set<number>();
  const out: GameSummary[] = [];
  for (const m of matches) {
    const g = m[0];
    if (!g || seen.has(g.id)) continue;
    seen.add(g.id);
    out.push(g);
    if (out.length >= limit) break;
  }
  return out;
}

/**
 * Trending with a safe fallback to the provider's all-time popular list.
 *
 * Never throws. Trending is a nice-to-have sidebar, so an upstream outage
 * (Steam or the games provider) must degrade to an empty list rather than
 * take down the whole page that renders it.
 */
export async function getTrendingOrPopular(limit = 10): Promise<GameSummary[]> {
  try {
    const trending = await getTrendingGames(limit);
    if (trending.length > 0) return trending;
  } catch {
    /* fall through to popular */
  }
  try {
    return await gameProvider.getPopularGames(limit);
  } catch (err) {
    console.error("[trending] popular fallback failed:", err);
    return [];
  }
}
