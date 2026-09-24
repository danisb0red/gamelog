/**
 * The canonical origin of the site, for metadata, sitemaps and share cards.
 *
 * NEXT_PUBLIC_SITE_URL wins (set it once there is a custom domain).
 * VERCEL_PROJECT_PRODUCTION_URL is Vercel's stable production hostname without
 * a scheme, and — unlike VERCEL_URL — does not change per deployment, so
 * canonical links and og:image URLs never point at a preview build.
 */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/+$/, "")}`;
  return "http://localhost:3000";
}

export function absoluteUrl(path = "/"): string {
  return `${siteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}
