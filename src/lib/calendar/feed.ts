import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { logs, wishlist } from "@/lib/db/schema";
import { gameProvider } from "@/lib/games";
import { addDays, todayUtc } from "@/lib/releases";
import { buildCalendar } from "./ics";

/** Two weeks back so a game that just came out doesn't vanish; ~18 months ahead. */
const DAYS_BEHIND = 14;
const DAYS_AHEAD = 548;

/**
 * Throws when the provider fails. The route turns that into a 503 rather than
 * an empty calendar: a subscribed client treats an empty feed as "everything
 * was cancelled" and would wipe the user's events until the next good poll.
 */
export async function buildFeedForUser(userId: string, origin: string): Promise<string> {
  const [wished, shelved] = await Promise.all([
    db.select({ id: wishlist.gameId }).from(wishlist).where(eq(wishlist.userId, userId)),
    db.select({ id: logs.gameId }).from(logs).where(eq(logs.userId, userId)),
  ]);
  const ids = [...new Set([...wished, ...shelved].map((r) => r.id))];

  const today = todayUtc();
  const entries =
    ids.length === 0
      ? []
      : await gameProvider.getReleasesForGames(addDays(today, -DAYS_BEHIND), addDays(today, DAYS_AHEAD), ids);

  return buildCalendar({ entries, origin });
}
