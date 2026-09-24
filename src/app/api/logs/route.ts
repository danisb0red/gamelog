import { NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { games, logs } from "@/lib/db/schema";
import { refreshGameAggregates } from "@/lib/db/ratings";
import { getRequestUser, ensureProfile } from "@/lib/auth";

const STATUSES = ["playing", "finished", "backlog", "dropped", "replaying"] as const;
type Status = (typeof STATUSES)[number];

type GameInput = {
  id: number;
  name: string;
  slug: string;
  coverUrl: string | null;
  releaseYear: number | null;
};

type LogPayload = {
  game: GameInput;
  status: Status;
  rating: number | null;
  review: string | null;
  platform: string | null;
  loggedAt: string | null; // "YYYY-MM-DD"
};

/** Parse a "YYYY-MM-DD" diary date to a Date (local noon, to avoid day shifts). */
function parseLoggedAt(value: string | null | undefined): Date | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const d = new Date(`${value}T12:00:00`);
  return isNaN(d.getTime()) ? undefined : d;
}

/** POST /api/logs — upserts the game into the cache, then inserts the log. */
export async function POST(request: Request) {
  const user = await getRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: Partial<LogPayload>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const game = body.game;
  if (!game || typeof game.id !== "number") {
    return NextResponse.json({ error: "game.id is required" }, { status: 400 });
  }
  if (!body.status || !STATUSES.includes(body.status)) {
    return NextResponse.json({ error: "valid status is required" }, { status: 400 });
  }
  if (body.rating != null && (body.rating < 0.5 || body.rating > 5)) {
    return NextResponse.json({ error: "rating must be 0.5–5" }, { status: 400 });
  }

  // Lazily cache the game (insert, or refresh metadata if it already exists).
  await db
    .insert(games)
    .values({
      id: game.id,
      slug: game.slug,
      name: game.name,
      coverUrl: game.coverUrl,
      releaseYear: game.releaseYear,
    })
    .onConflictDoUpdate({
      target: games.id,
      set: { name: game.name, coverUrl: game.coverUrl, syncedAt: new Date() },
    });

  await ensureProfile(user);

  const [log] = await db
    .insert(logs)
    .values({
      userId: user.id,
      gameId: game.id,
      status: body.status,
      rating: body.rating != null ? body.rating.toString() : null,
      review: body.review?.trim() || null,
      platform: body.platform?.trim() || null,
      loggedAt: parseLoggedAt(body.loggedAt),
    })
    .returning();

  if (body.rating != null) await refreshGameAggregates(game.id);

  return NextResponse.json({ log }, { status: 201 });
}

/** GET /api/logs — recent logs for the signed-in user, joined with game info. */
export async function GET(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ logs: [] });

  const rows = await db
    .select({
      id: logs.id,
      status: logs.status,
      rating: logs.rating,
      review: logs.review,
      loggedAt: logs.loggedAt,
      gameId: games.id,
      gameName: games.name,
      coverUrl: games.coverUrl,
      releaseYear: games.releaseYear,
    })
    .from(logs)
    .innerJoin(games, eq(logs.gameId, games.id))
    .where(eq(logs.userId, user.id))
    .orderBy(desc(logs.loggedAt))
    .limit(50);

  return NextResponse.json({ logs: rows });
}
