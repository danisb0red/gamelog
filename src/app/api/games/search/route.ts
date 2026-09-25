import { NextResponse } from "next/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import { gameProvider } from "@/lib/games";
import { getRequestUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { logs, wishlist } from "@/lib/db/schema";

/**
 * GET /api/games/search?q=elden
 * Searches the active games provider and returns a lightweight payload for the
 * instant-search UI. For a signed-in viewer each result also carries `mine`:
 * the id, status and rating of their latest diary entry for that game, or null.
 * Anonymous viewers get no `mine` key at all.
 */
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q") ?? "";
  if (!q.trim()) return NextResponse.json({ results: [] });

  try {
    // Started before the search, awaited after it: who-is-asking is an auth
    // round trip, and doing it second added that latency to every keystroke's
    // search. The catch keeps a failed lookup from rejecting unobserved if the
    // search itself throws first.
    const userPromise = getRequestUser(request).catch(() => null);
    const results = await gameProvider.searchGames(q);

    // "Which of these have I logged?" is a nicety on top of search: if the
    // lookup fails the results must still come back.
    let mineById: Map<number, { id: string; status: string; rating: number | null }> | null =
      null;
    let wished = new Set<number>();
    try {
      const user = await userPromise;
      if (user && results.length > 0) {
        const ids = results.map((g) => g.id);
        // Two independent lookups over the same ids; no reason to run them in turn.
        const [rows, wishedRows] = await Promise.all([
          db
            .select({ id: logs.id, gameId: logs.gameId, status: logs.status, rating: logs.rating })
            .from(logs)
            .where(and(eq(logs.userId, user.id), inArray(logs.gameId, ids)))
            .orderBy(desc(logs.loggedAt), desc(logs.createdAt)),
          db
            .select({ gameId: wishlist.gameId })
            .from(wishlist)
            .where(and(eq(wishlist.userId, user.id), inArray(wishlist.gameId, ids))),
        ]);
        wished = new Set(wishedRows.map((r) => r.gameId));
        mineById = new Map();
        // Newest first, so the first row seen per game is its latest entry.
        for (const r of rows) {
          if (!mineById.has(r.gameId)) {
            mineById.set(r.gameId, {
              id: r.id,
              status: r.status,
              rating: r.rating != null ? Number(r.rating) : null,
            });
          }
        }
      }
    } catch (err) {
      console.error("search: could not load viewer logs", err);
    }

    const byId = mineById;
    return NextResponse.json({
      results: byId
        ? results.map((g) => ({ ...g, mine: byId.get(g.id) ?? null, wishlisted: wished.has(g.id) }))
        : results,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
