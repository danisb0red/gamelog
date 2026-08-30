import { NextResponse } from "next/server";
import { gameProvider } from "@/lib/games";
import { getRequestUser } from "@/lib/auth";
import {
  getGameAggregate,
  getGameReviews,
  getUserLogForGame,
} from "@/lib/db/queries";
import { db } from "@/lib/db";
import { games } from "@/lib/db/schema";
import { fail } from "../../_lib";

export const dynamic = "force-dynamic";

/**
 * Full game detail: provider data + community rating + reviews, plus this
 * user's own log when authenticated. One request per screen.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  let game;
  try {
    game = await gameProvider.getGame(slug);
  } catch (err) {
    console.error("[v1/games]", err);
    return fail("The games database isn't responding", 502);
  }
  if (!game) return fail("Game not found", 404);

  // Same lazy cache the web page does, so logs can FK to a real row.
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

  const user = await getRequestUser(request);
  const [aggregate, reviews, mine] = await Promise.all([
    getGameAggregate(game.id),
    getGameReviews(game.id),
    user ? getUserLogForGame(user.id, game.id) : Promise.resolve(null),
  ]);

  return NextResponse.json({ game, aggregate, reviews, mine });
}
