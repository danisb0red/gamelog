import "server-only";
import type { DeveloperPage, GameDetail, GameProvider, GameSummary, ReleaseEntry } from "./types";

/**
 * RAWG provider. Server-only — API key stays on the server.
 *
 * RAWG is a large open games database with a dead-simple key (email signup,
 * no 2FA). Free tier: 20k requests/month. Docs: https://rawg.io/apidocs
 *
 * Note: RAWG's `background_image` is a landscape promo image, not a portrait
 * box-cover. It's a real image and fine for now; if we later want true cover
 * art we can switch to IGDB, which the provider abstraction makes trivial.
 */

const RAWG_BASE = "https://api.rawg.io/api";
const API_KEY = process.env.RAWG_API_KEY;

/** How long to wait on RAWG before giving up. Their Cloudflare edge hangs ~20s
 *  on a 522, which is far too long to make a user sit through. */
const RAWG_TIMEOUT_MS = 8000;

/**
 * Reject if `p` hasn't settled within `ms`.
 *
 * Deliberately does NOT pass an AbortSignal to fetch: a signal opts the request
 * out of Next's per-render fetch memoization. Racing a timer instead leaves the
 * caching behaviour untouched — we simply stop waiting. The underlying request
 * runs on to populate the data cache; its rejection is swallowed so an abandoned
 * fetch can't surface as an unhandled rejection.
 */
function withTimeout<T>(p: Promise<T>, label: string): Promise<T> {
  p.catch(() => {});
  let timer: ReturnType<typeof setTimeout>;
  return Promise.race([
    p,
    new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error(`RAWG ${label} timed out after ${RAWG_TIMEOUT_MS}ms`)),
        RAWG_TIMEOUT_MS,
      );
    }),
  ]).finally(() => clearTimeout(timer)) as Promise<T>;
}

type RawgGame = {
  id: number;
  name: string;
  slug: string;
  released: string | null; // "YYYY-MM-DD"
  background_image: string | null;
  added?: number; // RAWG popularity signal (how many users have it)
  tba?: boolean; // "to be announced" — not actually released
};

/**
 * Score how well a result matches the query. RAWG already returns plausible
 * matches; this re-ranks them so stronger title matches win, with popularity
 * breaking ties — so a hyped game beats an obscure one that matched equally.
 */
function relevanceScore(query: string, name: string): number {
  const q = query.toLowerCase().trim();
  const n = name.toLowerCase();
  if (n === q) return 1000;
  if (n.startsWith(q)) return 600;
  if (n.includes(q)) return 400;
  // Otherwise, fraction of meaningful query words present in the title.
  const words = q.split(/\s+/).filter((w) => w.length > 1);
  if (words.length === 0) return 0;
  const hits = words.filter((w) => n.includes(w)).length;
  return (hits / words.length) * 200;
}

export const rawgProvider: GameProvider = {
  async searchGames(q, limit = 12): Promise<GameSummary[]> {
    const term = q.trim();
    if (!term) return [];
    if (!API_KEY) {
      throw new Error("Missing RAWG_API_KEY. Add it to .env.local — see .env.local.example.");
    }

    // Fetch a wider candidate pool, then re-rank locally and trim to `limit`.
    const params = new URLSearchParams({
      key: API_KEY,
      search: term,
      page_size: String(Math.max(limit * 2, 20)),
    });

    const res = await withTimeout(
      fetch(`${RAWG_BASE}/games?${params}`, {
        // Cache identical searches for 24h — game metadata barely changes and
        // this keeps us comfortably under the free-tier request budget.
        next: { revalidate: 60 * 60 * 24 },
      }),
      "search",
    );
    if (!res.ok) {
      throw new Error(`RAWG search failed: ${res.status} ${await res.text()}`);
    }

    const data = (await res.json()) as { results: RawgGame[] };

    const ranked = data.results
      .map((g) => ({ g, score: relevanceScore(term, g.name) }))
      .sort((a, b) => b.score - a.score || (b.g.added ?? 0) - (a.g.added ?? 0))
      .slice(0, limit);

    return ranked.map(({ g }) => ({
      id: g.id,
      name: g.name,
      slug: g.slug,
      coverUrl: g.background_image,
      releaseYear: g.released ? Number(g.released.slice(0, 4)) : null,
    }));
  },

  async getGame(slugOrId): Promise<GameDetail | null> {
    if (!API_KEY) {
      throw new Error("Missing RAWG_API_KEY. Add it to .env.local — see .env.local.example.");
    }

    async function fetchDetail(idOrSlug: string): Promise<RawgDetail | null> {
      const res = await withTimeout(
        fetch(`${RAWG_BASE}/games/${encodeURIComponent(idOrSlug)}?key=${API_KEY}`, {
          next: { revalidate: 60 * 60 * 24 },
        }),
        "detail",
      );
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`RAWG detail failed: ${res.status} ${await res.text()}`);
      return (await res.json()) as RawgDetail;
    }

    let g = await fetchDetail(String(slugOrId));
    // RAWG sometimes returns a redirect stub (slug only, no id) for aliased
    // slugs — follow it once to the canonical entry.
    if (g && !g.id && g.redirect && g.slug && g.slug !== String(slugOrId)) {
      g = await fetchDetail(g.slug);
    }
    // No usable game (not found or unresolved stub).
    if (!g || !g.id) return null;

    // Screenshots are a separate endpoint; failure here shouldn't break the page.
    let screenshots: string[] = [];
    try {
      const shotRes = await withTimeout(
        fetch(`${RAWG_BASE}/games/${g.id}/screenshots?key=${API_KEY}`, {
          next: { revalidate: 60 * 60 * 24 },
        }),
        "screenshots",
      );
      if (shotRes.ok) {
        const shots = (await shotRes.json()) as { results: { image: string }[] };
        screenshots = shots.results.map((s) => s.image).filter(Boolean).slice(0, 6);
      }
    } catch {
      /* ignore screenshot failures */
    }

    return {
      id: g.id,
      name: g.name,
      slug: g.slug,
      coverUrl: g.background_image,
      releaseYear: g.released ? Number(g.released.slice(0, 4)) : null,
      description: g.description_raw || null,
      releaseDate: g.released,
      platforms: (g.platforms ?? []).map((p) => p.platform.name),
      genres: (g.genres ?? []).map((x) => x.name),
      developers: (g.developers ?? []).map((x) => ({ name: x.name, slug: x.slug })),
      publishers: (g.publishers ?? []).map((x) => ({ name: x.name, slug: x.slug })),
      playtimeHours: g.playtime || null,
      externalRating: typeof g.rating === "number" ? g.rating : null,
      metacritic: typeof g.metacritic === "number" ? g.metacritic : null,
      screenshots,
      // RAWG's suggested-games endpoint isn't on the free tier we use, so this
      // provider has no related games to offer and the shelf stays hidden.
      similar: [],
    };
  },

  async getDeveloper(slugOrId, sort = "-released"): Promise<DeveloperPage | null> {
    if (!API_KEY) {
      throw new Error("Missing RAWG_API_KEY. Add it to .env.local — see .env.local.example.");
    }
    const key = encodeURIComponent(String(slugOrId));

    const devRes = await withTimeout(
      fetch(`${RAWG_BASE}/developers/${key}?key=${API_KEY}`, {
        next: { revalidate: 60 * 60 * 24 },
      }),
      "developer",
    );
    if (devRes.status === 404) return null;
    if (!devRes.ok) {
      throw new Error(`RAWG developer failed: ${devRes.status} ${await devRes.text()}`);
    }
    const dev = (await devRes.json()) as { name: string };

    const params = new URLSearchParams({
      key: API_KEY,
      developers: String(slugOrId),
      ordering: sort,
      page_size: "24",
    });
    const gamesRes = await withTimeout(
      fetch(`${RAWG_BASE}/games?${params}`, {
        next: { revalidate: 60 * 60 * 24 },
      }),
      "developer games",
    );
    const gamesData = gamesRes.ok
      ? ((await gamesRes.json()) as { results: RawgGame[] })
      : { results: [] };

    return {
      name: dev.name,
      games: gamesData.results.map((g) => ({
        id: g.id,
        name: g.name,
        slug: g.slug,
        coverUrl: g.background_image,
        releaseYear: g.released ? Number(g.released.slice(0, 4)) : null,
      })),
    };
  },

  async getPopularGames(limit = 12): Promise<GameSummary[]> {
    if (!API_KEY) {
      throw new Error("Missing RAWG_API_KEY. Add it to .env.local — see .env.local.example.");
    }

    // "Popular right now" ≈ most-added games from the last couple of years —
    // but only ones that are actually out (not TBA / future-dated hype).
    const today = new Date();
    const start = new Date(today);
    start.setFullYear(start.getFullYear() - 2);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const todayStr = fmt(today);

    const params = new URLSearchParams({
      key: API_KEY,
      ordering: "-added",
      dates: `${fmt(start)},${todayStr}`,
      page_size: "40", // over-fetch, then filter to released titles
    });

    const res = await withTimeout(
      fetch(`${RAWG_BASE}/games?${params}`, {
        next: { revalidate: 60 * 60 * 6 }, // refresh popularity a few times a day
      }),
      "popular",
    );
    if (!res.ok) {
      throw new Error(`RAWG popular failed: ${res.status} ${await res.text()}`);
    }
    const data = (await res.json()) as { results: RawgGame[] };

    return data.results
      .filter((g) => !g.tba && g.released && g.released <= todayStr)
      .slice(0, limit)
      .map((g) => ({
        id: g.id,
        name: g.name,
        slug: g.slug,
        coverUrl: g.background_image,
        releaseYear: g.released ? Number(g.released.slice(0, 4)) : null,
      }));
  },

  // RAWG's upcoming-releases data isn't on the free tier; the calendar renders
  // its empty state rather than guessing.
  async getReleases(): Promise<ReleaseEntry[]> {
    return [];
  },

  async getReleasesForGames(): Promise<ReleaseEntry[]> {
    return [];
  },
};

type RawgDetail = RawgGame & {
  redirect?: boolean;
  description_raw?: string;
  rating?: number;
  playtime?: number;
  metacritic?: number;
  platforms?: { platform: { name: string } }[];
  genres?: { name: string }[];
  developers?: { name: string; slug: string }[];
  publishers?: { name: string; slug: string }[];
};
