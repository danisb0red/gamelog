import "server-only";
import { cache } from "react";
import { gameProvider } from "./index";
import type { ReleaseEntry } from "./types";

/**
 * Release loaders for pages. Never throw.
 *
 * A month is several IGDB pages behind a 4 req/s limit — measured at 6.8s
 * cold and 2ms from the shared cache. Callers render these inside a Suspense
 * boundary so a cold month streams in behind the page instead of blocking it,
 * and an outage costs the calendar, not the page that hosts it.
 *
 * Wrapped in React's cache(), keyed on a string rather than the ids array:
 * Home renders two consumers of the same window in sibling Suspense
 * boundaries, and on a cold cache both would otherwise miss at once and fetch
 * the same IGDB pages twice against the rate limit.
 */
const loadCached = cache(
  async (from: string, to: string, idsKey: string): Promise<{ entries: ReleaseEntry[]; failed: boolean }> => {
    try {
      const ids = idsKey ? idsKey.split(",").map(Number) : [];
      return { entries: await gameProvider.getReleases(from, to, ids), failed: false };
    } catch (err) {
      console.error("[releases] load failed:", err);
      return { entries: [], failed: true };
    }
  },
);

export function loadReleases(from: string, to: string, gameIds: number[] = []) {
  return loadCached(from, to, [...new Set(gameIds)].sort((a, b) => a - b).join(","));
}
