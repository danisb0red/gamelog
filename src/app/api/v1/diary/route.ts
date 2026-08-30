import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth";
import { getRecentLogs } from "@/lib/db/queries";
import { unauthorized } from "../_lib";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return unauthorized();

  const limit = Number(new URL(request.url).searchParams.get("limit") ?? 50);
  const entries = await getRecentLogs(user.id, Math.min(Math.max(limit, 1), 100));
  return NextResponse.json({ entries });
}
