import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth";
import { getUserGames, getCurrentlyPlaying } from "@/lib/db/queries";
import { unauthorized } from "../_lib";

export const dynamic = "force-dynamic";

/**
 * The user's collection. `?status=` filters; omitted returns everything.
 * `playing` is returned alongside so the home screen is one round trip.
 */
export async function GET(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return unauthorized();

  const status = new URL(request.url).searchParams.get("status");
  const [all, playing] = await Promise.all([
    getUserGames(user.id),
    getCurrentlyPlaying(user.id),
  ]);

  const games = status ? all.filter((g) => g.status === status) : all;
  return NextResponse.json({ games, playing });
}
