import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { games, wishlist } from "@/lib/db/schema";
import { getRequestUser, ensureProfile } from "@/lib/auth";

type GameInput = {
  id: number;
  name: string;
  slug: string;
  coverUrl: string | null;
  releaseYear: number | null;
};

/** POST /api/wishlist — add a game to the user's wishlist. No cap. */
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

  // The game may never have been logged by anyone, so it may not be cached —
  // and wishlist.game_id is a foreign key.
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

  // The unique constraint makes a double-add a no-op rather than a duplicate,
  // so the toggle is safe to press twice.
  await db
    .insert(wishlist)
    .values({ userId: user.id, gameId: game.id })
    .onConflictDoNothing();

  return NextResponse.json({ ok: true }, { status: 201 });
}

/** DELETE /api/wishlist?gameId=… — remove a game from the wishlist. */
export async function DELETE(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  // Parse before querying: `Number("abc")` is NaN, which Postgres rejects as a
  // bigint — a malformed query string would surface as a 500 rather than a 400.
  const gameId = Number(new URL(request.url).searchParams.get("gameId"));
  if (!Number.isInteger(gameId))
    return NextResponse.json({ error: "A numeric gameId is required" }, { status: 400 });

  await db
    .delete(wishlist)
    .where(and(eq(wishlist.userId, user.id), eq(wishlist.gameId, gameId)));

  return NextResponse.json({ ok: true });
}
