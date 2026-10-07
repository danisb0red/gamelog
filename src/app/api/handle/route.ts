import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { handleProblem, normalizeHandle } from "@/lib/handle";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * GET /api/handle?u=sam — is this handle free?
 *
 * Public on purpose: handles are already public (they are in profile URLs), so
 * this reveals nothing a visitor couldn't see. It is a convenience for the
 * sign-up form, not the guarantee — ensureProfile is what actually claims a
 * handle, and falls back if two people raced for the same one.
 */
export async function GET(request: Request) {
  const handle = normalizeHandle(new URL(request.url).searchParams.get("u") ?? "");
  const problem = handleProblem(handle);
  if (problem) return NextResponse.json({ available: false, reason: problem }, { headers: NO_STORE });

  try {
    const [row] = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.username, handle))
      .limit(1);
    return NextResponse.json(
      { available: !row, reason: row ? "That handle is taken." : null },
      { headers: NO_STORE },
    );
  } catch (err) {
    console.error("[handle] availability lookup failed:", err);
    return NextResponse.json({ error: "Could not check" }, { status: 500, headers: NO_STORE });
  }
}
