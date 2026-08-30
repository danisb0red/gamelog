import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { games, listItems, lists } from "@/lib/db/schema";
import { getRequestUser } from "@/lib/auth";

type GameInput = {
  id: number;
  name: string;
  slug: string;
  coverUrl: string | null;
  releaseYear: number | null;
};

/** POST /api/lists/:id/items — add a game to a list (owner only). */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: listId } = await params;
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const [list] = await db
    .select({ userId: lists.userId })
    .from(lists)
    .where(eq(lists.id, listId))
    .limit(1);
  if (!list) return NextResponse.json({ error: "List not found" }, { status: 404 });
  if (list.userId !== user.id)
    return NextResponse.json({ error: "Not your list" }, { status: 403 });

  let body: { game?: GameInput };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const game = body.game;
  if (!game || typeof game.id !== "number")
    return NextResponse.json({ error: "game.id is required" }, { status: 400 });

  // Cache the game, then append it to the end of the list.
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

  const [{ max }] = await db
    .select({ max: sql<number>`coalesce(max(${listItems.position}), -1)` })
    .from(listItems)
    .where(eq(listItems.listId, listId));

  await db
    .insert(listItems)
    .values({ listId, gameId: game.id, position: Number(max) + 1 })
    .onConflictDoNothing(); // already in the list → no-op

  return NextResponse.json({ ok: true }, { status: 201 });
}

/** PATCH /api/lists/:id/items — move an item up/down (owner only). */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: listId } = await params;
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  let body: { itemId?: string; direction?: "up" | "down" };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.itemId || (body.direction !== "up" && body.direction !== "down"))
    return NextResponse.json({ error: "itemId and direction required" }, { status: 400 });

  const [list] = await db
    .select({ userId: lists.userId })
    .from(lists)
    .where(eq(lists.id, listId))
    .limit(1);
  if (!list || list.userId !== user.id)
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });

  const ordered = await db
    .select({ id: listItems.id, position: listItems.position })
    .from(listItems)
    .where(eq(listItems.listId, listId))
    .orderBy(listItems.position);

  const idx = ordered.findIndex((i) => i.id === body.itemId);
  if (idx === -1) return NextResponse.json({ error: "Item not found" }, { status: 404 });
  const swapIdx = body.direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= ordered.length)
    return NextResponse.json({ ok: true }); // already at the edge

  const a = ordered[idx];
  const b = ordered[swapIdx];
  await db.update(listItems).set({ position: b.position }).where(eq(listItems.id, a.id));
  await db.update(listItems).set({ position: a.position }).where(eq(listItems.id, b.id));

  return NextResponse.json({ ok: true });
}

/** DELETE /api/lists/:id/items?itemId=… — remove a game (owner only). */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: listId } = await params;
  const itemId = new URL(request.url).searchParams.get("itemId");
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!itemId) return NextResponse.json({ error: "itemId required" }, { status: 400 });

  const [list] = await db
    .select({ userId: lists.userId })
    .from(lists)
    .where(eq(lists.id, listId))
    .limit(1);
  if (!list || list.userId !== user.id)
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });

  await db
    .delete(listItems)
    .where(and(eq(listItems.id, itemId), eq(listItems.listId, listId)));

  return NextResponse.json({ ok: true });
}
