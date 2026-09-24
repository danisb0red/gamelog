import "server-only";
import { cache } from "react";
import { getList, getProfileByUsername } from "./queries";

/**
 * Per-request memoised lookups, so a page and its generateMetadata share one
 * query instead of each making their own.
 */
export const getListCached = cache(getList);
export const getProfileCached = cache(getProfileByUsername);
