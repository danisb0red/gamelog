import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

// /u/ is deliberately NOT disallowed. Profiles, shelves and diaries carry a
// noindex meta tag instead: a robots.txt disallow would also stop link-preview
// bots (which honour robots.txt) from reading their og tags, and would make
// Google unable to see the noindex at all.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/auth/", "/login"] },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
