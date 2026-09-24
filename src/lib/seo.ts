import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/site";

/** Cut at a word boundary, add an ellipsis only when something was dropped. */
export function truncate(text: string, max = 155): string {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max - 1);
  const at = cut.lastIndexOf(" ");
  const base = at > max * 0.6 ? cut.slice(0, at) : cut;
  return `${base.replace(/[\s,.;:–—-]+$/, "")}…`;
}

export const NOINDEX: Metadata["robots"] = { index: false, follow: false };

/**
 * A child's `openGraph` replaces the layout's wholesale rather than merging, so
 * every page states the fields it needs; this keeps that to one call.
 *
 * The share-card image is always named explicitly. Leaving it to Next to inject
 * the segment's opengraph-image file was tried first, and it did not happen for
 * the dynamic routes — the game and profile pages, the ones people actually
 * share, shipped with a title and no picture. An explicit URL has nothing to
 * inject and nothing to silently fail.
 */
export function pageMetadata(o: {
  title: string;
  description: string;
  path: string;
  type?: "website" | "profile";
  robots?: Metadata["robots"];
  /** Path of this page's own share card; the site card when omitted. */
  image?: string;
}): Metadata {
  const images = [{ url: o.image ?? "/opengraph-image", width: 1200, height: 630 }];
  return {
    title: o.title,
    description: o.description,
    alternates: { canonical: o.path },
    robots: o.robots,
    openGraph: {
      title: o.title,
      description: o.description,
      url: absoluteUrl(o.path),
      siteName: "GameLog",
      type: o.type ?? "website",
      images,
    },
    twitter: { card: "summary_large_image", title: o.title, description: o.description, images },
  };
}
