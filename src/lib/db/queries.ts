import "server-only";
import { and, asc, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { db } from "./index";
import { favorites, games, listItems, lists, logs, profiles, wishlist } from "./schema";

/** A user's favorite games (max 4), in order. */
export async function getUserFavorites(userId: string) {
  return db
    .select({
      gameId: games.id,
      gameName: games.name,
      gameSlug: games.slug,
      coverUrl: games.coverUrl,
      releaseYear: games.releaseYear,
    })
    .from(favorites)
    .innerJoin(games, eq(favorites.gameId, games.id))
    .where(eq(favorites.userId, userId))
    .orderBy(asc(favorites.position));
}

/** Games a user has wishlisted, newest first. */
export async function getUserWishlist(userId: string) {
  return db
    .select({
      gameId: games.id,
      gameName: games.name,
      gameSlug: games.slug,
      coverUrl: games.coverUrl,
      releaseYear: games.releaseYear,
    })
    .from(wishlist)
    .innerJoin(games, eq(wishlist.gameId, games.id))
    .where(eq(wishlist.userId, userId))
    .orderBy(desc(wishlist.addedAt));
}

/**
 * Whether one game is on a user's wishlist. A separate query rather than a
 * scan of getUserWishlist because a wishlist has no cap and the game page only
 * needs the one answer.
 */
export async function isGameWishlisted(userId: string, gameId: number) {
  const [row] = await db
    .select({ id: wishlist.id })
    .from(wishlist)
    .where(and(eq(wishlist.userId, userId), eq(wishlist.gameId, gameId)))
    .limit(1);
  return row != null;
}

/** All lists owned by a user, with item count and up to 4 cover thumbnails. */
export async function getUserLists(userId: string) {
  const rows = await db
    .select({
      id: lists.id,
      title: lists.title,
      description: lists.description,
      isRanked: lists.isRanked,
      createdAt: lists.createdAt,
      itemCount: sql<number>`count(${listItems.id})`,
    })
    .from(lists)
    .leftJoin(listItems, eq(listItems.listId, lists.id))
    .where(eq(lists.userId, userId))
    .groupBy(lists.id)
    .orderBy(desc(lists.createdAt));

  // Grab a few covers per list for a collage thumbnail.
  const withCovers = await Promise.all(
    rows.map(async (l) => {
      const covers = await db
        .select({ coverUrl: games.coverUrl })
        .from(listItems)
        .innerJoin(games, eq(listItems.gameId, games.id))
        .where(eq(listItems.listId, l.id))
        .orderBy(asc(listItems.position))
        .limit(4);
      return { ...l, itemCount: Number(l.itemCount), covers: covers.map((c) => c.coverUrl) };
    }),
  );
  return withCovers;
}

/** A list with its owner and ordered games. Null if not found. */
export async function getList(listId: string) {
  const [list] = await db
    .select({
      id: lists.id,
      title: lists.title,
      description: lists.description,
      isRanked: lists.isRanked,
      isPublic: lists.isPublic,
      userId: lists.userId,
      username: profiles.username,
      displayName: profiles.displayName,
    })
    .from(lists)
    .innerJoin(profiles, eq(lists.userId, profiles.id))
    .where(eq(lists.id, listId))
    .limit(1);
  if (!list) return null;

  const items = await db
    .select({
      itemId: listItems.id,
      position: listItems.position,
      note: listItems.note,
      gameId: games.id,
      gameName: games.name,
      gameSlug: games.slug,
      coverUrl: games.coverUrl,
      releaseYear: games.releaseYear,
    })
    .from(listItems)
    .innerJoin(games, eq(listItems.gameId, games.id))
    .where(eq(listItems.listId, listId))
    .orderBy(asc(listItems.position));

  return { ...list, items };
}

/** Games the user currently has in a Playing/Replaying state (deduped, newest first). */
export async function getCurrentlyPlaying(userId: string, limit = 6) {
  const rows = await db
    .select({
      status: logs.status,
      rating: logs.rating,
      loggedAt: logs.loggedAt,
      gameId: games.id,
      gameName: games.name,
      gameSlug: games.slug,
      coverUrl: games.coverUrl,
      releaseYear: games.releaseYear,
    })
    .from(logs)
    .innerJoin(games, eq(logs.gameId, games.id))
    .where(and(eq(logs.userId, userId), inArray(logs.status, ["playing", "replaying"])))
    .orderBy(desc(logs.loggedAt));

  // One card per game (a game may have multiple logs).
  const seen = new Set<number>();
  const out: typeof rows = [];
  for (const r of rows) {
    if (seen.has(r.gameId)) continue;
    seen.add(r.gameId);
    out.push(r);
    if (out.length >= limit) break;
  }
  return out;
}

/** Recent logs for a user, newest first, joined with game info — the diary. */
export async function getRecentLogs(userId: string, limit = 50) {
  return db
    .select({
      id: logs.id,
      status: logs.status,
      rating: logs.rating,
      review: logs.review,
      platform: logs.platform,
      loggedAt: logs.loggedAt,
      gameId: games.id,
      gameName: games.name,
      gameSlug: games.slug,
      coverUrl: games.coverUrl,
      releaseYear: games.releaseYear,
    })
    .from(logs)
    .innerJoin(games, eq(logs.gameId, games.id))
    .where(eq(logs.userId, userId))
    .orderBy(desc(logs.loggedAt))
    .limit(limit);
}

/** Every game a user has logged — one entry per game (its latest log), newest first. */
export async function getUserGames(userId: string) {
  const rows = await db
    .select({
      status: logs.status,
      rating: logs.rating,
      platform: logs.platform,
      loggedAt: logs.loggedAt,
      gameId: games.id,
      gameName: games.name,
      gameSlug: games.slug,
      coverUrl: games.coverUrl,
      releaseYear: games.releaseYear,
    })
    .from(logs)
    .innerJoin(games, eq(logs.gameId, games.id))
    .where(eq(logs.userId, userId))
    .orderBy(desc(logs.loggedAt));

  const seen = new Set<number>();
  const out: typeof rows = [];
  for (const r of rows) {
    if (seen.has(r.gameId)) continue;
    seen.add(r.gameId);
    out.push(r);
  }
  return out;
}

/** A user's profile by id. */
export async function getProfileById(userId: string) {
  const [row] = await db.select().from(profiles).where(eq(profiles.id, userId)).limit(1);
  return row ?? null;
}

/** A user's profile by username (for /u/[username]). */
export async function getProfileByUsername(username: string) {
  const [row] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.username, username))
    .limit(1);
  return row ?? null;
}

/** Community rating aggregate for a game, computed live from logs. */
export async function getGameAggregate(gameId: number) {
  const [agg] = await db
    .select({
      avg: sql<string | null>`avg(${logs.rating})`,
      ratingCount: sql<number>`count(${logs.rating})`,
      logCount: sql<number>`count(*)`,
    })
    .from(logs)
    .where(eq(logs.gameId, gameId));

  return {
    average: agg?.avg ? Number(agg.avg) : null,
    ratingCount: Number(agg?.ratingCount ?? 0),
    logCount: Number(agg?.logCount ?? 0),
  };
}

/** Recent reviews for a game (logs that have review text), with author. */
export async function getGameReviews(gameId: number, limit = 10) {
  return db
    .select({
      id: logs.id,
      rating: logs.rating,
      review: logs.review,
      status: logs.status,
      loggedAt: logs.loggedAt,
      username: profiles.username,
      displayName: profiles.displayName,
    })
    .from(logs)
    .innerJoin(profiles, eq(logs.userId, profiles.id))
    .where(and(eq(logs.gameId, gameId), isNotNull(logs.review)))
    .orderBy(desc(logs.loggedAt))
    .limit(limit);
}

/** The signed-in user's most recent log for a game, if any. */
export async function getUserLogForGame(userId: string, gameId: number) {
  const [row] = await db
    .select({ status: logs.status, rating: logs.rating, platform: logs.platform })
    .from(logs)
    .where(and(eq(logs.userId, userId), eq(logs.gameId, gameId)))
    .orderBy(desc(logs.loggedAt))
    .limit(1);
  return row ?? null;
}
