import { NextResponse } from "next/server";
import { getRequestUser, ensureProfile } from "@/lib/auth";
import { getProfileById, getUserGames } from "@/lib/db/queries";
import { STATUSES, type Status } from "@/lib/status";
import { unauthorized } from "../_lib";

export const dynamic = "force-dynamic";

/** The signed-in user's profile plus the counters every screen header needs. */
export async function GET(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return unauthorized();

  await ensureProfile(user);
  const [profile, games] = await Promise.all([
    getProfileById(user.id),
    getUserGames(user.id),
  ]);

  const counts = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<Status, number>;
  for (const g of games) {
    if ((STATUSES as readonly string[]).includes(g.status)) counts[g.status as Status]++;
  }

  const rated = games.filter((g) => g.rating != null).map((g) => Number(g.rating));
  const average = rated.length
    ? Number((rated.reduce((a, b) => a + b, 0) / rated.length).toFixed(2))
    : null;

  return NextResponse.json({
    id: user.id,
    email: user.email ?? null,
    username: profile?.username ?? null,
    displayName: profile?.displayName ?? null,
    stats: { total: games.length, rated: rated.length, average, counts },
  });
}
