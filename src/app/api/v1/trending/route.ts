import { NextResponse } from "next/server";
import { getTrendingOrPopular } from "@/lib/games/trending";

export const dynamic = "force-dynamic";

/** Never throws — degrades to an empty list, same contract as the web app. */
export async function GET() {
  return NextResponse.json({ games: await getTrendingOrPopular(20) });
}
