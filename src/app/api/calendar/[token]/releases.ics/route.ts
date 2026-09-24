import { NextResponse } from "next/server";
import { userForToken } from "@/lib/calendar/tokens";
import { buildFeedForUser } from "@/lib/calendar/feed";
import { siteOrigin } from "@/lib/calendar/origin";

const HEADERS = {
  "Content-Type": "text/calendar; charset=utf-8",
  "X-Robots-Tag": "noindex",
  // Private: the URL is a credential. Short max-age so a regenerate takes
  // effect quickly; calendar apps poll far less often than this anyway.
  "Cache-Control": "private, max-age=900",
};

/** GET — public by design: the token in the path is the credential. */
export async function GET(request: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;

  // 404, not 401: don't confirm that a guessed URL was ever a real feed.
  const userId = await userForToken(token);
  if (!userId) return new NextResponse("Not found", { status: 404, headers: { "X-Robots-Tag": "noindex" } });

  try {
    const body = await buildFeedForUser(userId, siteOrigin(request));
    return new NextResponse(body, { headers: HEADERS });
  } catch (err) {
    console.error("[calendar] feed failed:", err);
    return new NextResponse("Temporarily unavailable", {
      status: 503,
      headers: { "Retry-After": "600", "X-Robots-Tag": "noindex" },
    });
  }
}
