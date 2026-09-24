import "server-only";
import { eq, sql } from "drizzle-orm";
import { db } from "./index";
import { games } from "./schema";

/**
 * A game's community rating: one vote per person.
 *
 * `logs` is a diary, so one person can hold several entries for a game — every
 * status change and every "Edit your log" adds a dated row, and a new row
 * carries the previous rating forward. Averaging every rated row counted that
 * person once per entry: the demo account's two Arkham Origins entries counted
 * as two ratings. Taking each person's latest rated entry makes the average
 * mean what it says, and the count mean people.
 *
 * "Latest *rated*": a later entry with no rating (a replay logged without
 * stars) doesn't erase the opinion they gave before.
 */
export async function communityRating(gameId: number) {
  const rows = await db.execute<{ avg: string | null; n: string }>(sql`
    select avg(rating) as avg, count(*) as n from (
      select distinct on (user_id) rating
      from logs
      where game_id = ${gameId} and rating is not null
      order by user_id, logged_at desc, created_at desc
    ) latest
  `);
  const row = rows[0];
  return { average: row?.avg != null ? Number(row.avg) : null, count: Number(row?.n ?? 0) };
}

/** Recompute and store a game's average rating + count on its `games` row. */
export async function refreshGameAggregates(gameId: number) {
  const { average, count } = await communityRating(gameId);
  await db
    .update(games)
    .set({ ratingAvg: average != null ? average.toFixed(2) : null, ratingCount: count })
    .where(eq(games.id, gameId));
}
