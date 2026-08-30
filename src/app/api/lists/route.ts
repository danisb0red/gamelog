import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { lists } from "@/lib/db/schema";
import { getRequestUser, ensureProfile } from "@/lib/auth";

/** POST /api/lists — create a new list. */
export async function POST(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  let body: { title?: string; description?: string; isRanked?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const title = body.title?.trim();
  if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });

  await ensureProfile(user);
  const [list] = await db
    .insert(lists)
    .values({
      userId: user.id,
      title,
      description: body.description?.trim() || null,
      isRanked: !!body.isRanked,
    })
    .returning();

  return NextResponse.json({ list }, { status: 201 });
}
