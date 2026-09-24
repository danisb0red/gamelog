import "server-only";
import type { Metadata } from "next";
import { getProfileCached } from "@/lib/db/cached";
import { NOINDEX, pageMetadata } from "@/lib/seo";

/**
 * Shared by the profile, shelf and diary pages. noindex, not a robots.txt
 * disallow: nobody agreed to have their logs in search results, but a robots
 * disallow would also stop link-preview bots fetching the page and its card.
 */
export async function profileMetadata(
  username: string,
  section?: "shelf" | "diary",
): Promise<Metadata> {
  const profile = await getProfileCached(username).catch((err) => {
    console.error("[seo] profile lookup failed:", err);
    return null;
  });
  if (!profile) return { title: "Profile", robots: NOINDEX };

  const name = profile.displayName ?? profile.username;
  const path = `/u/${profile.username}${section ? `/${section}` : ""}`;
  const label = section === "shelf" ? "Shelf" : section === "diary" ? "Diary" : null;
  return pageMetadata({
    title: label ? `${name}'s ${label.toLowerCase()}` : `${name} (@${profile.username})`,
    description: label
      ? `${name}'s ${label.toLowerCase()} on GameLog.`
      : `${name}'s game log on GameLog.`,
    path,
    type: "profile",
    image: `/u/${profile.username}/opengraph-image`,
    robots: NOINDEX,
  });
}
