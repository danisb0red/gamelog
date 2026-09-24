/**
 * The public origin the feed's links and UIDs are built on.
 *
 * Stand-in for `absoluteUrl` in src/lib/site.ts, which another branch is
 * adding — swap this for it once both land. Canonical env first so a preview
 * deployment doesn't mint UIDs that differ from production's (a changed UID
 * would duplicate every event in the subscriber's calendar); the request's own
 * origin is the fallback for local runs.
 */
export function siteOrigin(request: Request): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/+$/, "");
  const prod = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (prod) return `https://${prod}`;
  return new URL(request.url).origin;
}
