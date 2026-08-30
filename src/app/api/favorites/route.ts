import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { favorites, games } from "@/lib/db/schema";
import { getRequestUser, ensureProfile } from "@/lib/auth";

const MAX_FAVORITES = 4;

type GameInput = {
  id: number;
  name: string;
  slug: string;
  coverUrl: string | null;
  releaseYear: number | null;
};

/** POST /api/favorites — add a game to favorites (max 4). */
export async function POST(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  let body: { game?: GameInput };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const game = body.game;
  if (!game || typeof game.id !== "number")
    return NextResponse.json({ error: "game.id is required" }, { status: 400 });

  await ensureProfile(user);

  // Already a favorite? No-op.
  const existing = await db
    .select({ id: favorites.id })
    .from(favorites)
    .where(and(eq(favorites.userId, user.id), eq(favorites.gameId, game.id)))
    .limit(1);
  if (existing.length > 0) return NextResponse.json({ ok: true });

  const [{ count, max }] = await db
    .select({
      count: sql<number>`count(*)`,
      max: sql<number>`coalesce(max(${favorites.position}), -1)`,
    })
    .from(favorites)
    .where(eq(favorites.userId, user.id));

  if (Number(count) >= MAX_FAVORITES)
    return NextResponse.json(
      { error: `You can only have ${MAX_FAVORITES} favorites.` },
      { status: 409 },
    );

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

  await db
    .insert(favorites)
    .values({ userId: user.id, gameId: game.id, position: Number(max) + 1 });

  return NextResponse.json({ ok: true }, { status: 201 });
}

/** DELETE /api/favorites?gameId=… — remove a favorite. */
export async function DELETE(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const gameId = new URL(request.url).searchParams.get("gameId");
  if (!gameId) return NextResponse.json({ error: "gameId required" }, { status: 400 });

  await db
    .delete(favorites)
    .where(and(eq(favorites.userId, user.id), eq(favorites.gameId, Number(gameId))));

  return NextResponse.json({ ok: true });
}
