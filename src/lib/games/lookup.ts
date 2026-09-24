import "server-only";
import { cache } from "react";
import { gameProvider } from "./index";

/**
 * One game lookup per request, shared by the page, generateMetadata and the
 * share card. React.cache dedupes within a render pass; IGDB's own 24h fetch
 * cache makes a cold miss in another route cheap too.
 *
 * The page uses getGameCached so a provider outage still reaches its error
 * boundary. Metadata and cards use getGameSafe: they're nice-to-haves and must
 * never turn an outage into a 500 of their own.
 */
export const getGameCached = cache(async (slug: string) => gameProvider.getGame(slug));

export async function getGameSafe(slug: string) {
  try {
    return await getGameCached(slug);
  } catch (err) {
    console.error("[seo] game lookup failed:", err);
    return null;
  }
}
