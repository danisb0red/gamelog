import { NextResponse } from "next/server";
import { gameProvider } from "@/lib/games";

/**
 * GET /api/games/search?q=elden
 * Searches the active games provider (mock until real keys are set) and
 * returns a lightweight payload for the instant-search UI.
 */
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q") ?? "";
  if (!q.trim()) return NextResponse.json({ results: [] });

  try {
    const results = await gameProvider.searchGames(q);
    return NextResponse.json({ results });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
