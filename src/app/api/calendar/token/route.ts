import { NextResponse } from "next/server";
import { getRequestUser, ensureProfile } from "@/lib/auth";
import { hasToken, revokeToken, rotateToken } from "@/lib/calendar/tokens";
import { siteOrigin } from "@/lib/calendar/origin";

// Responses carry a secret or reveal whether one exists: never cache.
const NO_STORE = { "Cache-Control": "no-store" };

/** GET /api/calendar/token — whether a link exists. The link itself is never retrievable. */
export async function GET(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401, headers: NO_STORE });
  return NextResponse.json({ exists: await hasToken(user.id) }, { headers: NO_STORE });
}

/** POST /api/calendar/token — create or replace the link. Returned once; only its hash is kept. */
export async function POST(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401, headers: NO_STORE });
  await ensureProfile(user);

  const token = await rotateToken(user.id);
  const url = `${siteOrigin(request)}/api/calendar/${token}/releases.ics`;
  return NextResponse.json({ url }, { status: 201, headers: NO_STORE });
}

/** DELETE /api/calendar/token — revoke; the link stops working immediately. */
export async function DELETE(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401, headers: NO_STORE });
  await revokeToken(user.id);
  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}
