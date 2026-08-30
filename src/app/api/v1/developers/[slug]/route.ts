import { NextResponse } from "next/server";
import { gameProvider } from "@/lib/games";
import { fail } from "../../_lib";

export const dynamic = "force-dynamic";

/** A developer and their catalogue, so a game's studio is a place you can go. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  try {
    const dev = await gameProvider.getDeveloper(slug);
    if (!dev) return fail("Developer not found", 404);
    return NextResponse.json(dev);
  } catch (err) {
    console.error("[v1/developers]", err);
    return fail("The games database isn't responding", 502);
  }
}
