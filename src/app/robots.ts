import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

// /u/ is deliberately NOT disallowed. Profiles, shelves and diaries carry a
// noindex meta tag instead: a robots.txt disallow would also stop link-preview
// bots (which honour robots.txt) from reading their og tags, and would make
// Google unable to see the noindex at all.
//
// Every page here is a function run, so a crawler is a bill. Measured on Pro over
// 3 days (Oct 24-27): GPTBot made ~280K requests (178K of them /releases), Amazon's
// crawlers ~37K, and the credit went $11 in 3 days. Earlier, GoogleOther (Google's
// research crawler, not Search indexing) was ~16K on /g/[slug].
//
// These are AI-training and bulk crawlers with no search benefit to GameLog.
// OAI-SearchBot, PerplexityBot and Googlebot are left alone: they send people.
const BULK_CRAWLERS = [
  "GPTBot",
  "ClaudeBot",
  "CCBot",
  "Bytespider",
  "meta-externalagent",
  "Amazonbot",
  "Amzn-SearchBot",
  "GoogleOther",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/auth/",
          "/login",
          // The calendar's filters make an endless set of URLs for one page;
          // /releases?month=… stays crawlable and its canonical keeps only that.
          "/releases?*view=",
          "/releases?*platform=",
        ],
      },
      { userAgent: BULK_CRAWLERS, disallow: "/" },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
