import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Next 16 renamed `middleware` to `proxy`. This runs before routes and keeps
 * the Supabase auth session fresh by reading + rewriting the session cookies.
 *
 * Per the Next docs, we still verify auth inside each route/server component —
 * this proxy only refreshes tokens, it does not gate access.
 */
export async function proxy(request: NextRequest) {
  const redirected = redirectOldShelfLink(request);
  if (redirected) return redirected;

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Touching getUser() triggers a token refresh when needed.
  await supabase.auth.getUser();

  return response;
}

/**
 * The shelf used to live on the profile, so `/u/someone?status=playing` is a
 * URL people have already shared. Forward it rather than dropping the filter.
 *
 * This has to happen here rather than with `redirect()` inside the page: the
 * profile route streams a `loading` shell before its data resolves, and once
 * the shell has flushed Next can no longer send an HTTP redirect — it degrades
 * to a `<meta http-equiv="refresh">` with a 200, which flashes a skeleton and
 * makes a no-JS client wait a full second. At the edge it is a real redirect
 * before anything renders.
 *
 * 307, not 308: permanent redirects get cached hard by browsers and are
 * painful to walk back, and this layout is two days old.
 */
function redirectOldShelfLink(request: NextRequest) {
  const url = request.nextUrl;
  // Exactly `/u/<username>` — not the shelf itself, and not /diary.
  if (!/^\/u\/[^/]+$/.test(url.pathname)) return null;
  if (!url.searchParams.has("status") && !url.searchParams.has("platform")) return null;

  const to = new URL(`${url.pathname}/shelf`, url);
  to.search = url.search;
  return NextResponse.redirect(to, 307);
}

export const config = {
  matcher: [
    // Run on everything except static assets and images.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
