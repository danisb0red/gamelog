import { NextResponse } from "next/server";
import { gameProvider } from "@/lib/games";
import { fail } from "../_lib";

export const dynamic = "force-dynamic";

/**
 * Game search. Public on purpose — it exposes no user data, and gating it would
 * mean the app couldn't show anything before sign-in.
 *
 * IGDB credentials never leave the server; the device only ever sees results.
 */
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (!q) return NextResponse.json({ results: [] });

  try {
    return NextResponse.json({ results: await gameProvider.searchGames(q, 20) });
  } catch (err) {
    console.error("[v1/search]", err);
    return fail("Search is unavailable", 502);
  }
}
