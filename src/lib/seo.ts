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
 * every page states the fields it needs; this keeps that to one call. The image
 * comes from the segment's opengraph-image file, which Next injects itself.
 */
export function pageMetadata(o: {
  title: string;
  description: string;
  path: string;
  type?: "website" | "profile";
  robots?: Metadata["robots"];
  /** True when the route has its own opengraph-image file; Next adds that one. */
  ownImage?: boolean;
}): Metadata {
  // Overriding `openGraph` also drops the image inherited from the root
  // opengraph-image file, so pages without a card of their own name the site
  // card explicitly.
  const images = o.ownImage ? undefined : [{ url: "/opengraph-image", width: 1200, height: 630 }];
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
