import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

// /u/ is deliberately NOT disallowed. Profiles, shelves and diaries carry a
// noindex meta tag instead: a robots.txt disallow would also stop link-preview
// bots (which honour robots.txt) from reading their og tags, and would make
// Google unable to see the noindex at all.
//
// GoogleOther (Google's research/one-off crawler, not Search indexing) and
// Amazonbot were ~17K of the requests on /g/[slug], every one a function run,
// and were what pushed the free plan past its Active CPU allowance.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/api/", "/auth/", "/login"] },
      { userAgent: ["GoogleOther", "Amazonbot"], disallow: "/" },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
