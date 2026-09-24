import "server-only";
import { createHash } from "node:crypto";
import { eq, lt } from "drizzle-orm";
import { db } from "@/lib/db";
import { igdbCache } from "@/lib/db/schema";
import type {
  ReleaseEntry,
  ReleaseKind,
  DeveloperPage,
  GameDetail,
  GameProvider,
  GameSort,
  GameSummary,
} from "./types";

/** Slugify a company name for use in developer-page URLs. */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * IGDB provider. Server-only — Twitch credentials must never reach the browser.
 *
 * IGDB is owned by Twitch, so we authenticate with a Twitch app token
 * (client_credentials grant), cache it in memory until it expires, and
 * attach it to every IGDB request.
 *
 * Docs: https://api-docs.igdb.com/  |  Query language: https://api-docs.igdb.com/#apicalypse
 *
 * Gotcha: the games endpoint renamed `category` to `game_type`. Filtering on the
 * old name does NOT error — IGDB just matches nothing and returns `[]`, so it
 * looks like "no results" rather than a broken query. `game_type = 0` means a
 * main game (excludes DLC, expansions, bundles and duplicate version entries).
 */

const TWITCH_TOKEN_URL = "https://id.twitch.tv/oauth2/token";
const IGDB_BASE = "https://api.igdb.com/v4";

const CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error(
      "Missing TWITCH_CLIENT_ID / TWITCH_CLIENT_SECRET. Add them to .env.local — see .env.local.example.",
    );
  }

  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value;
  }

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    grant_type: "client_credentials",
  });

  const res = await fetch(`${TWITCH_TOKEN_URL}?${params}`, { method: "POST" });
  if (!res.ok) {
    throw new Error(`Twitch token request failed: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return cachedToken.value;
}

/**
 * IGDB caps the free tier at 4 requests/second — a *rate* limit, unlike RAWG's
 * monthly quota. Fan-out callers (trending resolves ~20 Steam titles at once)
 * blow straight through it and get 429s, so every request passes through this
 * token bucket first.
 *
 * Module-level state: fine here because each server instance holds its own
 * budget, and Next's fetch cache absorbs the repeat traffic anyway.
 */
const MAX_REQUESTS_PER_SECOND = 4;
const recentStarts: number[] = [];

async function rateLimit(): Promise<void> {
  for (;;) {
    const now = Date.now();
    // Drop anything that has aged out of the trailing 1s window.
    while (recentStarts.length > 0 && now - recentStarts[0] >= 1000) recentStarts.shift();
    if (recentStarts.length < MAX_REQUESTS_PER_SECOND) {
      recentStarts.push(now);
      return;
    }
    // Budget spent — sleep until the oldest request leaves the window.
    await new Promise((r) => setTimeout(r, 1000 - (now - recentStarts[0]) + 5));
  }
}

/**
 * Response cache, keyed by endpoint + query body.
 *
 * Next's `next: { revalidate }` fetch cache only applies to GET requests, and
 * every IGDB call is a POST (Apicalypse sends the query in the body) — so that
 * option is inert here and IGDB would otherwise be hit on every single render.
 * RAWG got 24h caching for free because it uses GET; this restores parity.
 *
 * Two tiers, because one was not enough:
 *
 *  L1 is this Map — per instance, nanoseconds, gone on restart.
 *  L2 is the `igdb_cache` table in Postgres, shared by every instance.
 *
 * L2 is the one that matters. Serverless gives each instance its own heap, so
 * with L1 alone the *first* render on every new instance and every deploy paid
 * the full IGDB round trip: `/` measured 8.4s cold against 0.8s warm, which on
 * a phone reads as a dead tab bar. One instance's fetch now warms the cache for
 * all of them.
 */
const responseCache = new Map<string, { value: unknown; expiresAt: number }>();

/**
 * Hashed, not the raw query.
 *
 * The key is a primary key, and Postgres btree entries cap out around 2.7kB —
 * an Apicalypse body with a dozen expanded fields is not far off that. A digest
 * is bounded, and the endpoint stays in the clear so the table is still legible
 * when something looks wrong.
 */
function cacheKeyFor(endpoint: string, body: string): string {
  return `${endpoint}:${createHash("sha256").update(body).digest("hex")}`;
}

/** L1 then L2. A cache that cannot be reached is a miss, never an error. */
async function cacheGet<T>(key: string): Promise<T | undefined> {
  const hit = responseCache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.value as T;

  try {
    const [row] = await db
      .select({ value: igdbCache.value, expiresAt: igdbCache.expiresAt })
      .from(igdbCache)
      .where(eq(igdbCache.key, key))
      .limit(1);
    if (!row || row.expiresAt.getTime() <= Date.now()) return undefined;
    responseCache.set(key, { value: row.value, expiresAt: row.expiresAt.getTime() });
    return row.value as T;
  } catch (err) {
    console.error("igdb_cache read failed, falling through to IGDB:", err);
    return undefined;
  }
}

/** Write-through to both tiers. Awaited: serverless can kill the instance the
 *  moment the response is sent, and a dropped write means the next cold start
 *  pays for IGDB all over again. */
async function cacheSet(key: string, value: unknown, expiresAt: Date): Promise<void> {
  responseCache.set(key, { value, expiresAt: expiresAt.getTime() });
  try {
    await db
      .insert(igdbCache)
      .values({ key, value, expiresAt })
      .onConflictDoUpdate({ target: igdbCache.key, set: { value, expiresAt } });
    // Release windows put today's date in the query, so yesterday's keys are
    // never requested again and would sit in the table for good. An occasional
    // sweep keeps it bounded without needing a scheduler.
    if (Math.random() < 0.02) {
      await db.delete(igdbCache).where(lt(igdbCache.expiresAt, new Date()));
    }
  } catch (err) {
    console.error("igdb_cache write failed (L1 still holds it):", err);
  }
}

export async function igdbQuery<T>(
  endpoint: string,
  body: string,
  revalidateSeconds = 60 * 60 * 24, // 24h; game metadata barely changes
): Promise<T> {
  const cacheKey = cacheKeyFor(endpoint, body);
  const cached = await cacheGet<T>(cacheKey);
  if (cached !== undefined) return cached;

  const token = await getAccessToken();

  // One retry: a burst from another concurrent render can still tip us over.
  for (let attempt = 0; ; attempt++) {
    await rateLimit();
    const res = await fetch(`${IGDB_BASE}/${endpoint}`, {
      method: "POST",
      headers: {
        "Client-ID": CLIENT_ID!,
        Authorization: `Bearer ${token}`,
        "Content-Type": "text/plain",
      },
      body,
      next: { revalidate: revalidateSeconds },
    });
    if (res.status === 429 && attempt < 1) {
      await new Promise((r) => setTimeout(r, 1100));
      continue;
    }
    if (!res.ok) {
      throw new Error(`IGDB ${endpoint} failed: ${res.status} ${await res.text()}`);
    }
    const value = (await res.json()) as T;
    await cacheSet(cacheKey, value, new Date(Date.now() + revalidateSeconds * 1000));
    return value;
  }
}

type RawGame = {
  id: number;
  name: string;
  slug: string;
  first_release_date?: number; // unix seconds
  cover?: { image_id: string };
};

/**
 * Our provider-agnostic sort values (named after RAWG's `ordering`) mapped to
 * Apicalypse `sort` clauses. IGDB has no direct "added" metric, so popularity
 * uses total_rating_count — how many people have rated it.
 */
const IGDB_SORT: Record<GameSort, string> = {
  "-released": "sort first_release_date desc;",
  released: "sort first_release_date asc;",
  "-rating": "sort total_rating desc;",
  name: "sort name asc;",
  "-added": "sort total_rating_count desc;",
};

/** Build an IGDB image URL at a given size. See https://api-docs.igdb.com/#images */
function coverUrl(imageId: string | undefined, size = "t_cover_big"): string | null {
  if (!imageId) return null;
  return `https://images.igdb.com/igdb/image/upload/${size}/${imageId}.jpg`;
}

/** Every list-shaped IGDB response maps to a summary the same way. */
function toSummary(g: RawGame): GameSummary {
  return {
    id: g.id,
    name: g.name,
    slug: g.slug,
    coverUrl: coverUrl(g.cover?.image_id),
    releaseYear: g.first_release_date
      ? new Date(g.first_release_date * 1000).getUTCFullYear()
      : null,
  };
}

/** IGDB caps a nested expansion at 10 rows, so the curated list sets the shelf length. */
const RELATED_LIMIT = 10;

/** ±4 years — wide enough to cover a console generation, narrow enough that a
 *  2026 game isn't answered with a PS2 title. */
const RELATED_ERA_SECONDS = 4 * 365 * 24 * 60 * 60;

/**
 * IGDB hangs these on an enormous share of its catalogue, so matching on them
 * just returns whatever is most popular — a visual novel came back with
 * Palworld and Lethal Company. Excluded from the *filter* when a game has a
 * narrower genre to match on; still counted when ranking.
 */
const BROAD_GENRE_IDS = new Set([31 /* Adventure */, 32 /* Indie */]);

/**
 * Fallback for games IGDB has no curated `similar_games` for — obscure titles
 * and ones still far from release.
 *
 * Same genres, released nearby, then re-ranked by how many genres actually
 * overlap: sharing "Hack and slash" *and* "Adventure" beats sharing only
 * "Adventure", which is a genre half of IGDB carries.
 *
 * Never throws. A dead secondary query must cost the page its related shelf,
 * not the whole render.
 */
async function relatedByGenreAndEra(
  id: number,
  genreIds: number[],
  releasedAt: number | undefined,
): Promise<GameSummary[]> {
  if (genreIds.length === 0) return [];

  try {
    const era =
      releasedAt != null
        ? `& first_release_date >= ${releasedAt - RELATED_ERA_SECONDS}
           & first_release_date <= ${releasedAt + RELATED_ERA_SECONDS}`
        : "";

    const narrow = genreIds.filter((x) => !BROAD_GENRE_IDS.has(x));
    const filterIds = narrow.length > 0 ? narrow : genreIds;

    // `genres = (a,b)` is "has any of these". `{a,b}` would demand the genre
    // list match exactly, which returns almost nothing.
    const rows = await igdbQuery<(RawGame & { genres?: number[] })[]>(
      "games",
      `
        fields name, slug, first_release_date, cover.image_id, genres;
        where genres = (${filterIds.join(",")}) & game_type = 0 & version_parent = null
          & cover != null & total_rating_count != null & id != ${id} ${era};
        sort total_rating_count desc;
        limit 30;
      `,
    );

    const wanted = new Set(genreIds);
    return rows
      .map((g, i) => ({ g, i, overlap: (g.genres ?? []).filter((x) => wanted.has(x)).length }))
      // Ties keep IGDB's own popularity order, which is what `i` preserves.
      .sort((a, b) => b.overlap - a.overlap || a.i - b.i)
      .slice(0, RELATED_LIMIT)
      .map((r) => toSummary(r.g));
  } catch {
    return [];
  }
}

export const igdbProvider: GameProvider = {
  async searchGames(q, limit = 12): Promise<GameSummary[]> {
    const term = q.trim();
    if (!term) return [];

    const body = `
      search "${term.replace(/"/g, '\\"')}";
      fields name, slug, first_release_date, cover.image_id;
      where version_parent = null & game_type = 0;
      limit ${limit};
    `;

    const rows = await igdbQuery<RawGame[]>("games", body);
    return rows.map(toSummary);
  },

  async getGame(slugOrId): Promise<GameDetail | null> {
    const where =
      typeof slugOrId === "number" || /^\d+$/.test(String(slugOrId))
        ? `where id = ${Number(slugOrId)};`
        : `where slug = "${String(slugOrId).replace(/"/g, '\\"')}";`;

    const core = `name, slug, summary, first_release_date, rating, aggregated_rating,
      cover.image_id, genres.name, platforms.name, screenshots.image_id,
      involved_companies.company.name, involved_companies.developer,
      involved_companies.publisher`;

    // The related shelf rides along in this query to stay inside the 4/sec
    // budget, which costs it isolation: an unknown field in `fields` is a hard
    // 400, so a rename would take down the whole game page rather than one
    // section. IGDB has renamed a field under us before (`category` became
    // `game_type`), so drop the expansion and retry once rather than trust it.
    let g: RawDetail | undefined;
    try {
      [g] = await igdbQuery<RawDetail[]>(
        "games",
        `fields ${core},
           similar_games.name, similar_games.slug, similar_games.first_release_date,
           similar_games.game_type, similar_games.cover.image_id;
         ${where}
         limit 1;`,
      );
    } catch (err) {
      console.error("IGDB detail query with similar_games failed, retrying without:", err);
      [g] = await igdbQuery<RawDetail[]>("games", `fields ${core}; ${where} limit 1;`);
    }
    if (!g) return null;

    // Expanded inline rather than fetched separately: the 4/sec budget is the
    // scarce resource, and IGDB's curated list is the good answer when it exists.
    const curated = (g.similar_games ?? [])
      // Covers only — the shelf is artwork — and no DLC or bundle entries.
      .filter((s) => s.cover && (s.game_type === undefined || s.game_type === 0))
      .slice(0, RELATED_LIMIT)
      .map(toSummary);

    const similar =
      curated.length > 0
        ? curated
        : await relatedByGenreAndEra(
            g.id,
            (g.genres ?? []).map((x) => x.id),
            g.first_release_date,
          );

    const companies = g.involved_companies ?? [];
    const releaseDate = g.first_release_date
      ? new Date(g.first_release_date * 1000).toISOString().slice(0, 10)
      : null;

    return {
      ...toSummary(g),
      description: g.summary ?? null,
      releaseDate,
      platforms: (g.platforms ?? []).map((p) => p.name),
      genres: (g.genres ?? []).map((x) => x.name),
      developers: companies
        .filter((c) => c.developer)
        .map((c) => ({ name: c.company.name, slug: slugify(c.company.name) })),
      publishers: companies
        .filter((c) => c.publisher)
        .map((c) => ({ name: c.company.name, slug: slugify(c.company.name) })),
      playtimeHours: null,
      externalRating: typeof g.rating === "number" ? g.rating / 20 : null, // 0–100 → 0–5
      metacritic: typeof g.aggregated_rating === "number" ? Math.round(g.aggregated_rating) : null,
      screenshots: (g.screenshots ?? [])
        .map((s) => coverUrl(s.image_id, "t_screenshot_med"))
        .filter((u): u is string => !!u)
        .slice(0, 6),
      similar,
    };
  },

  async getDeveloper(slugOrId, sort = "-released"): Promise<DeveloperPage | null> {
    // Resolve the company first — game pages link out using slugify(company.name),
    // which lines up with IGDB's own company slug.
    const key = String(slugOrId);
    const where = /^\d+$/.test(key)
      ? `where id = ${Number(key)};`
      : `where slug = "${key.replace(/"/g, '\\"')}";`;

    const [company] = await igdbQuery<{ id: number; name: string }[]>(
      "companies",
      `fields name, slug; ${where} limit 1;`,
    );
    if (!company) return null;

    const games = await igdbQuery<RawGame[]>(
      "games",
      `
        fields name, slug, first_release_date, cover.image_id;
        where involved_companies.company = ${company.id}
          & involved_companies.developer = true
          & game_type = 0;
        ${IGDB_SORT[sort]}
        limit 24;
      `,
    );

    return { name: company.name, games: games.map(toSummary) };
  },

  async getPopularGames(limit = 12): Promise<GameSummary[]> {
    const body = `
      fields name, slug, first_release_date, cover.image_id;
      where cover != null & game_type = 0 & total_rating_count != null;
      sort total_rating_count desc;
      limit ${limit};
    `;
    const rows = await igdbQuery<RawGame[]>("games", body);
    return rows.map(toSummary);
  },
  async getReleases(from, to, gameIds = []): Promise<ReleaseEntry[]> {
    const start = dayToUnix(from);
    const end = dayToUnix(to);
    // date_format = 0 is exact-day precision. Anything vaguer still carries a
    // timestamp — a "Q3 2026" game is stamped Sep 30 — so without this filter
    // every quarter-dated game would claim to release on the last day of it.
    const window = `date >= ${start} & date < ${end} & date_format = 0 & game.game_type = (${RELEASE_GAME_TYPES})`;

    const queries = [fetchReleaseRows(`${window} & game.hypes > 0`)];
    const ids = [...new Set(gameIds)].filter(Number.isInteger);
    if (ids.length > 0) queries.push(fetchReleaseRows(`${window} & game = (${ids.join(",")})`));

    const rows = (await Promise.all(queries)).flat();
    return groupReleaseRows(rows);
  },
};

/** Main games, remakes, remasters and expanded editions. Not DLC, bundles, ports or mods. */
const RELEASE_GAME_TYPES = "0,8,9,10";
const EDITION: Record<number, ReleaseEntry["edition"]> = { 8: "remake", 9: "remaster", 10: "expanded" };

/** Release dates move — delays land weekly — so this is fresher than game metadata. */
const RELEASES_TTL_SECONDS = 60 * 60 * 3;

/** IGDB's hard page size. A busy month is ~600 anticipated rows, so paginate. */
const PAGE = 500;
const MAX_PAGES = 6;

type RawRelease = {
  date: number;
  status?: number;
  release_region?: number;
  platform?: { abbreviation?: string; name?: string };
  game?: RawGame & { hypes?: number; game_type?: number };
};

function dayToUnix(day: string): number {
  const [y, m, d] = day.split("-").map(Number);
  return Date.UTC(y, m - 1, d) / 1000;
}

async function fetchReleaseRows(where: string): Promise<RawRelease[]> {
  const out: RawRelease[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const rows = await igdbQuery<RawRelease[]>(
      "release_dates",
      `fields date, status, release_region, platform.abbreviation, platform.name,
         game.name, game.slug, game.first_release_date, game.cover.image_id,
         game.hypes, game.game_type;
       where ${where};
       sort date asc;
       limit ${PAGE};
       offset ${page * PAGE};`,
      RELEASES_TTL_SECONDS,
    );
    out.push(...rows);
    if (rows.length < PAGE) break;
  }
  return out;
}

/** IGDB release statuses. Offline, cancelled and compatibility patches aren't releases. */
const STATUS_EXCLUDED = new Set([4, 5, 35, 36]);
const STATUS_KIND: Record<number, ReleaseKind> = { 1: "early-access", 2: "early-access", 3: "early-access", 34: "advanced-access" };
const KIND_RANK: Record<ReleaseKind, number> = { launch: 0, "re-release": 1, "advanced-access": 2, "early-access": 3 };

const REGION_NAME: Record<number, string> = {
  1: "Europe", 2: "North America", 3: "Australia", 4: "New Zealand",
  5: "Japan", 6: "China", 7: "Asia", 9: "Korea", 10: "Brazil",
};

/** A game held back more than this after its first release is arriving on new
 *  platforms, not launching — Fallout 76 on PS5 in 2026, say. */
const RE_RELEASE_GAP_SECONDS = 60 * 24 * 60 * 60;

/**
 * One row per game per platform per region per stage comes back; the calendar
 * wants one entry per game per day. Merge platforms, pick the most meaningful
 * stage for that day, and collapse regions to "worldwide" when any row is.
 */
function groupReleaseRows(rows: RawRelease[]): ReleaseEntry[] {
  type Acc = { row: RawRelease; platforms: Set<string>; regions: Set<number>; kinds: Set<ReleaseKind> };
  const byKey = new Map<string, Acc>();

  for (const r of rows) {
    const g = r.game;
    if (!g?.id || !g.slug) continue;
    if (r.status != null && STATUS_EXCLUDED.has(r.status)) continue;

    const date = new Date(r.date * 1000).toISOString().slice(0, 10);
    const key = `${g.id}:${date}`;
    const acc = byKey.get(key) ?? { row: r, platforms: new Set(), regions: new Set(), kinds: new Set() };

    const plat = r.platform?.abbreviation ?? r.platform?.name;
    if (plat) acc.platforms.add(plat);
    if (r.release_region != null) acc.regions.add(r.release_region);

    let kind: ReleaseKind = (r.status != null && STATUS_KIND[r.status]) || "launch";
    if (kind === "launch" && g.first_release_date && r.date - g.first_release_date > RE_RELEASE_GAP_SECONDS) {
      kind = "re-release";
    }
    acc.kinds.add(kind);
    byKey.set(key, acc);
  }

  return [...byKey.values()]
    .map(({ row, platforms, regions, kinds }): ReleaseEntry => {
      const g = row.game!;
      const kind = [...kinds].sort((a, b) => KIND_RANK[a] - KIND_RANK[b])[0];
      const worldwide = regions.size === 0 || regions.has(8) || regions.has(2) || regions.has(1);
      const onlyRegion = !worldwide && regions.size === 1 ? REGION_NAME[[...regions][0]] ?? null : null;
      return {
        game: toSummary(g),
        date: new Date(row.date * 1000).toISOString().slice(0, 10),
        platforms: [...platforms].sort(),
        kind,
        hype: g.hypes ?? 0,
        region: onlyRegion,
        edition: (g.game_type != null && EDITION[g.game_type]) || null,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date) || b.hype - a.hype);
}

type RawDetail = RawGame & {
  summary?: string;
  rating?: number;
  aggregated_rating?: number;
  genres?: { id: number; name: string }[];
  platforms?: { name: string }[];
  screenshots?: { image_id: string }[];
  /** IGDB's curated "similar games". `game_type` rides along so DLC and
   *  bundles can be dropped — the nested expansion can't be filtered. */
  similar_games?: (RawGame & { game_type?: number })[];
  involved_companies?: {
    developer: boolean;
    publisher: boolean;
    company: { name: string };
  }[];
};
