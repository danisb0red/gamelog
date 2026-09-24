import "server-only";
import { cache } from "react";
import { after } from "next/server";
import { and, eq, inArray, isNotNull, lt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { gamepassProducts, gamepassSync } from "@/lib/db/schema";
import { igdbQuery } from "./igdb";

/**
 * Game Pass availability, mirrored from Microsoft's public (unofficial) feeds
 * and matched to IGDB game ids.
 *
 * Which feeds mean "on Game Pass" (verified by each feed's own metadata title,
 * and by resolving every product):
 *   fdd9e2a7…  "All PC Games"        PC Game Pass
 *   f6f1f99f…  "All Console Games"   Game Pass Console (Ultimate is a subset of this)
 *   b8900d09…  "EA Play Games"       included with Ultimate / PC Game Pass
 *   f13cf6b4…  "Recently added"      a subset of the above
 *   393f05bf…  "Leaving soon"        a subset of the above
 * The catalog is the union of the first three (823 products); the last two only
 * change a product's state. The feeds carry no leaving dates and no tier
 * information, so neither is claimed anywhere.
 *
 * Freshness has no scheduler: a page that reads this triggers a background
 * refresh (`after`) when the snapshot is older than FRESH_MS, and the feature
 * hides itself when the snapshot is older than HIDE_MS — a stale "leaving soon"
 * is worse than none.
 */

const SIGL = "https://catalog.gamepass.com/sigls/v2";
const DISPLAY_CATALOG = "https://displaycatalog.mp.microsoft.com/v7.0/products";
const MARKET = "US";

const LISTS = {
  pc: "fdd9e2a7-0fee-49f6-ad69-4354098401ff",
  console: "f6f1f99f-9b49-4ccd-b3bf-4d9767a77f5e",
  eaPlay: "b8900d09-a491-44cc-916e-32b5acae621b",
  recent: "f13cf6b4-57e6-4459-89df-6aec18cf0538",
  leaving: "393f05bf-e596-4ef6-9487-6d4fa0eab987",
} as const;

const HOUR = 3_600_000;
const FRESH_MS = 12 * HOUR;
const HIDE_MS = 72 * HOUR;
/** A claimed-but-failed attempt blocks retries for this long (also the single-flight lock). */
const ATTEMPT_COOLDOWN_MS = 10 * 60_000;
/** Unmatched products are retried this often; IGDB links new releases late. */
const REMATCH_MS = 3 * 24 * HOUR;
const SYNC_ID = "main";

export type GamePassState = "catalog" | "recent" | "leaving";

// ── Feeds ───────────────────────────────────────────────────────────────────

async function fetchList(id: string): Promise<string[]> {
  const res = await fetch(`${SIGL}?id=${id}&language=en-us&market=${MARKET}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Game Pass list ${id} responded ${res.status}`);
  const data: unknown = await res.json();
  if (!Array.isArray(data)) throw new Error(`Game Pass list ${id} is not an array`);
  // Element 0 is list metadata (no `id`); products are the rest.
  return data.flatMap((e) => (e && typeof e === "object" && typeof (e as { id?: unknown }).id === "string" ? [(e as { id: string }).id] : []));
}

async function fetchFeeds(): Promise<Map<string, GamePassState>> {
  const [pc, con, ea, recent, leaving] = await Promise.all([
    fetchList(LISTS.pc),
    fetchList(LISTS.console),
    fetchList(LISTS.eaPlay),
    fetchList(LISTS.recent),
    fetchList(LISTS.leaving),
  ]);
  // The feeds have hundreds of entries each; a near-empty one means the shape
  // changed or Microsoft served a stub, and syncing it would wipe the catalog.
  if (pc.length < 100 || con.length < 100) {
    throw new Error(`Game Pass catalog looks wrong: pc=${pc.length} console=${con.length}`);
  }
  const state = new Map<string, GamePassState>();
  for (const id of [...pc, ...con, ...ea]) state.set(id, "catalog");
  // Precedence: leaving beats recent beats catalog. Only products that are also
  // in the catalog lists count, so a stray id can't add itself.
  for (const id of recent) if (state.has(id)) state.set(id, "recent");
  for (const id of leaving) if (state.has(id)) state.set(id, "leaving");
  return state;
}

type ProductInfo = { title: string; year: number | null };

/** Titles and release years for store ids, 200 at a time (URL length). */
async function fetchProducts(ids: string[]): Promise<Map<string, ProductInfo>> {
  const out = new Map<string, ProductInfo>();
  for (let i = 0; i < ids.length; i += 200) {
    const batch = ids.slice(i, i + 200);
    const res = await fetch(
      `${DISPLAY_CATALOG}?bigIds=${batch.join(",")}&market=${MARKET}&languages=en-US&MS-CV=DGU1mcuYo0WMMp+F.1`,
      { cache: "no-store" },
    );
    if (!res.ok) throw new Error(`Microsoft display catalog responded ${res.status}`);
    const data = (await res.json()) as {
      Products?: {
        ProductId: string;
        LocalizedProperties?: { ProductTitle?: string }[];
        MarketProperties?: { OriginalReleaseDate?: string }[];
      }[];
    };
    if (!Array.isArray(data.Products)) throw new Error("Microsoft display catalog: no Products array");
    for (const p of data.Products) {
      const title = p.LocalizedProperties?.[0]?.ProductTitle?.trim();
      if (!title) continue;
      const y = Number(p.MarketProperties?.[0]?.OriginalReleaseDate?.slice(0, 4));
      out.set(p.ProductId, { title, year: y > 1970 ? y : null });
    }
  }
  return out;
}

// ── Matching to IGDB ────────────────────────────────────────────────────────

/** Main game, remake, remaster, expanded game, port — never DLC or bundles. */
const GAME_TYPES = new Set([0, 8, 9, 10, 11]);

/** Lowercase, no diacritics, no ®™©, punctuation-insensitive. */
export function normaliseTitle(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[®™©]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Store-listing suffixes that are not part of the game's name. */
const EDITION_NOISE = [
  /\s*\((game preview|windows|pc|xbox|xbox series x\|s|xbox one)\)/gi,
  /\s*[-–:]\s*(standard|windows|pc|digital|deluxe|ultimate|cross-gen bundle|cross-gen)( edition| bundle)?\s*$/gi,
  /\s+(standard edition|windows edition|pc edition|digital edition|cross-gen bundle|for windows|game preview)\s*$/gi,
];

export function titleVariants(title: string): string[] {
  const raw = title.replace(/[®™©]/g, "").trim();
  let stripped = raw;
  for (const re of EDITION_NOISE) stripped = stripped.replace(re, "");
  stripped = stripped.trim();
  return [...new Set([raw, stripped])].filter((v) => v.length > 0 && !v.includes("*"));
}

const q = (s: string) => `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;

/** Store id → IGDB game id, through IGDB's external_games (Microsoft sources 11 and 31). */
async function matchByStoreId(productIds: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  for (let i = 0; i < productIds.length; i += 100) {
    const batch = productIds.slice(i, i + 100);
    const rows = await igdbQuery<{ uid: string; game?: { id: number; game_type?: number } }[]>(
      "external_games",
      `fields uid,game.game_type; where external_game_source = (11,31) & uid = (${batch.map(q).join(",")}); limit 500;`,
      60,
    );
    const seen = new Map<string, Set<number>>();
    for (const r of rows) {
      if (!r.game || (r.game.game_type != null && !GAME_TYPES.has(r.game.game_type))) continue;
      const set = seen.get(r.uid) ?? new Set<number>();
      set.add(r.game.id);
      seen.set(r.uid, set);
    }
    // Two different games behind one store id is a data problem — skip it.
    for (const [uid, set] of seen) if (set.size === 1) out.set(uid, [...set][0]);
  }
  return out;
}

/**
 * Title → IGDB game id. Only an exact match after normalisation counts, so
 * "Portal" can never become "Portal Knights". When several IGDB games share the
 * title (there are two "Sworn"s), the release year has to single one out;
 * otherwise it's a miss.
 */
async function matchByName(
  items: { productId: string; title: string; year: number | null }[],
): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  const batches: (typeof items)[] = [];
  for (let i = 0; i < items.length; i += 20) batches.push(items.slice(i, i + 20));

  // A few batches in flight at once: each IGDB round trip is ~1s, and the
  // shared token bucket in igdbQuery still enforces 4 req/s.
  const matchBatch = async (batch: typeof items) => {
    const variants = batch.flatMap((b) => titleVariants(b.title));
    if (variants.length === 0) return;
    const rows = await igdbQuery<{ id: number; name: string; first_release_date?: number; game_type?: number }[]>(
      "games",
      `fields name,first_release_date,game_type; where (${variants.map((v) => `name ~ ${q(v)}`).join(" | ")}) & game_type = (0,8,9,10,11); limit 500;`,
      60,
    );
    for (const b of batch) {
      const wanted = new Set(titleVariants(b.title).map(normaliseTitle));
      const cands = rows.filter((r) => wanted.has(normaliseTitle(r.name)));
      if (cands.length === 1) {
        out.set(b.productId, cands[0].id);
      } else if (cands.length > 1 && b.year != null) {
        const near = cands.filter((c) => {
          if (c.first_release_date == null) return false;
          return Math.abs(new Date(c.first_release_date * 1000).getUTCFullYear() - b.year!) <= 1;
        });
        if (near.length === 1) out.set(b.productId, near[0].id);
      }
    }
  };
  for (let i = 0; i < batches.length; i += 3) {
    await Promise.all(batches.slice(i, i + 3).map(matchBatch));
  }
  return out;
}

// ── Refresh ─────────────────────────────────────────────────────────────────

let inflight: Promise<void> | null = null;

/** Atomically claim the right to refresh. Cross-instance: the row is the lock. */
async function claimRefresh(): Promise<boolean> {
  await db.insert(gamepassSync).values({ id: SYNC_ID }).onConflictDoNothing();
  const claimed = await db
    .update(gamepassSync)
    .set({ attemptedAt: new Date() })
    .where(
      and(
        eq(gamepassSync.id, SYNC_ID),
        sql`(${gamepassSync.attemptedAt} is null or ${gamepassSync.attemptedAt} < now() - ${`${ATTEMPT_COOLDOWN_MS} milliseconds`}::interval)`,
      ),
    )
    .returning({ id: gamepassSync.id });
  return claimed.length > 0;
}

async function doRefresh(): Promise<void> {
  const startedAt = new Date();
  const feeds = await fetchFeeds();
  const feedIds = [...feeds.keys()];

  const existing = await db.select().from(gamepassProducts);
  const known = new Map(existing.map((r) => [r.productId, r]));

  // Titles are needed for products we've never seen, and for unmatched ones
  // that are due another attempt.
  const now = Date.now();
  const needInfo = feedIds.filter((id) => {
    const r = known.get(id);
    return !r || (r.igdbGameId == null && (!r.matchCheckedAt || now - r.matchCheckedAt.getTime() > REMATCH_MS));
  });
  const info = needInfo.length > 0 ? await fetchProducts(needInfo) : new Map<string, ProductInfo>();

  const byId = needInfo.length > 0 ? await matchByStoreId(needInfo.filter((id) => info.has(id))) : new Map<string, number>();
  const rest = needInfo.filter((id) => info.has(id) && !byId.has(id)).map((id) => ({ productId: id, ...info.get(id)! }));
  const byName = rest.length > 0 ? await matchByName(rest) : new Map<string, number>();

  const rows = feedIds.flatMap((id) => {
    const prev = known.get(id);
    const title = info.get(id)?.title ?? prev?.title;
    if (!title) return []; // no title resolved: leave it out until the next refresh
    const checked = info.has(id);
    return [
      {
        productId: id,
        title,
        state: feeds.get(id)!,
        igdbGameId: byId.get(id) ?? byName.get(id) ?? null,
        lastSeenAt: startedAt,
        matchCheckedAt: checked ? startedAt : null,
      },
    ];
  });

  for (let i = 0; i < rows.length; i += 200) {
    await db
      .insert(gamepassProducts)
      .values(rows.slice(i, i + 200).map((r) => ({ ...r, leavingSince: r.state === "leaving" ? startedAt : null })))
      .onConflictDoUpdate({
        target: gamepassProducts.productId,
        set: {
          title: sql`excluded.title`,
          state: sql`excluded.state`,
          lastSeenAt: sql`excluded.last_seen_at`,
          igdbGameId: sql`coalesce(excluded.igdb_game_id, ${gamepassProducts.igdbGameId})`,
          matchCheckedAt: sql`coalesce(excluded.match_checked_at, ${gamepassProducts.matchCheckedAt})`,
          // Keep the first time we saw it leaving; clear if it's no longer leaving.
          leavingSince: sql`case when excluded.state = 'leaving' then coalesce(${gamepassProducts.leavingSince}, excluded.leaving_since) else null end`,
        },
      });
  }

  // Gone from every feed: no longer on Game Pass.
  await db.delete(gamepassProducts).where(lt(gamepassProducts.lastSeenAt, startedAt));
  await db
    .update(gamepassSync)
    .set({ refreshedAt: new Date() })
    .where(eq(gamepassSync.id, SYNC_ID));

  console.info(
    `gamepass: refreshed ${rows.length} products (${needInfo.length} looked up, ${byId.size + byName.size} newly matched)`,
  );
}

/** Never throws; concurrent callers in one instance share one run. */
export function refreshGamePass(): Promise<void> {
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      if (!(await claimRefresh())) return;
      await doRefresh();
    } catch (err) {
      console.error("gamepass refresh failed (feature keeps serving the last snapshot, or hides):", err);
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

// ── Reads ───────────────────────────────────────────────────────────────────

/**
 * Whether the snapshot is recent enough to show, scheduling a refresh when it
 * isn't fresh. Once per request. `false` hides the feature.
 */
const snapshotUsable = cache(async (): Promise<boolean> => {
  try {
    const [row] = await db.select().from(gamepassSync).where(eq(gamepassSync.id, SYNC_ID)).limit(1);
    const age = row?.refreshedAt ? Date.now() - row.refreshedAt.getTime() : Infinity;
    if (age > FRESH_MS) {
      try {
        after(() => refreshGamePass());
      } catch {
        // Not in a request scope — nothing to schedule against.
      }
    }
    return age <= HIDE_MS;
  } catch (err) {
    console.error("gamepass snapshot check failed:", err);
    return false;
  }
});

export type GamePassInfo = { state: "on" | "leaving"; since: Date | null };

/** Game Pass status for IGDB game ids. Empty map when the feature is hidden or failing. */
export async function getGamePassInfo(gameIds: number[]): Promise<Map<number, GamePassInfo>> {
  const out = new Map<number, GamePassInfo>();
  if (gameIds.length === 0) return out;
  try {
    if (!(await snapshotUsable())) return out;
    const rows = await db
      .select({
        gameId: gamepassProducts.igdbGameId,
        state: gamepassProducts.state,
        leavingSince: gamepassProducts.leavingSince,
      })
      .from(gamepassProducts)
      .where(and(isNotNull(gamepassProducts.igdbGameId), inArray(gamepassProducts.igdbGameId, gameIds)));
    for (const r of rows) {
      const id = r.gameId!;
      const prev = out.get(id);
      // If any edition of the game is leaving, say so.
      if (r.state === "leaving") {
        if (!prev || prev.state !== "leaving" || (r.leavingSince && (!prev.since || r.leavingSince < prev.since))) {
          out.set(id, { state: "leaving", since: r.leavingSince });
        }
      } else if (!prev) {
        out.set(id, { state: "on", since: null });
      }
    }
  } catch (err) {
    console.error("gamepass read failed:", err);
    return new Map();
  }
  return out;
}

export async function getGamePassForGame(gameId: number): Promise<GamePassInfo | null> {
  return (await getGamePassInfo([gameId])).get(gameId) ?? null;
}
