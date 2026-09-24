import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { games, logs } from "@/lib/db/schema";
import { getRequestUser } from "@/lib/auth";
import { isStatus } from "@/lib/status";

type Body = {
  status?: string;
  rating?: number | null;
  review?: string | null;
  platform?: string | null;
  loggedAt?: string | null; // "YYYY-MM-DD"
};

/**
 * PATCH /api/logs/:id — amend one of your own diary entries in place.
 *
 * POST /api/logs stays "every save is a new dated entry". This exists for the
 * quick-log row on search, where a mis-tapped status or a star rating added a
 * moment later is a correction to the entry just made, not a new event. Only
 * the fields present in the body change.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const set: Partial<typeof logs.$inferInsert> = { updatedAt: new Date() };

  if (body.status !== undefined) {
    if (!isStatus(body.status)) {
      return NextResponse.json({ error: "valid status is required" }, { status: 400 });
    }
    set.status = body.status;
  }
  if (body.rating !== undefined) {
    if (
      body.rating !== null &&
      (typeof body.rating !== "number" || body.rating < 0.5 || body.rating > 5)
    ) {
      return NextResponse.json({ error: "rating must be 0.5–5" }, { status: 400 });
    }
    set.rating = body.rating !== null ? body.rating.toString() : null;
  }
  if (body.review !== undefined) set.review = body.review?.trim() || null;
  if (body.platform !== undefined) set.platform = body.platform?.trim() || null;
  if (body.loggedAt != null) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(body.loggedAt)) {
      return NextResponse.json({ error: "loggedAt must be YYYY-MM-DD" }, { status: 400 });
    }
    const d = new Date(`${body.loggedAt}T12:00:00`);
    if (!isNaN(d.getTime())) set.loggedAt = d;
  }

  const [log] = await db
    .update(logs)
    .set(set)
    .where(and(eq(logs.id, id), eq(logs.userId, user.id)))
    .returning();
  if (!log) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (body.rating !== undefined) {
    const [agg] = await db
      .select({
        avg: sql<string | null>`avg(${logs.rating})`,
        count: sql<number>`count(${logs.rating})`,
      })
      .from(logs)
      .where(eq(logs.gameId, log.gameId));
    await db
      .update(games)
      .set({
        ratingAvg: agg.avg ? Number(agg.avg).toFixed(2) : null,
        ratingCount: Number(agg.count),
      })
      .where(eq(games.id, log.gameId));
  }

  return NextResponse.json({ log });
}
