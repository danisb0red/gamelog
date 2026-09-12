"use client";

import { useLinkStatus } from "next/link";

/**
 * Pending feedback for a tab, rendered inside its <Link>.
 *
 * Tapping HOME did nothing visible for ~3.7s (worse on a cold serverless
 * instance), so the tap read as dropped and you pressed it again. `loading.tsx`
 * fixes the common case by letting the navigation commit immediately, but a
 * prefetch that hasn't finished — a phone on a bad connection, which is exactly
 * when this matters — still leaves a gap with nothing happening in it.
 *
 * This fills that gap: the moment a tab is pressed it shows a sweep on its top
 * edge, so the press is always acknowledged even when the destination isn't
 * ready. `useLinkStatus` must be rendered *inside* the Link whose status it
 * reports.
 */
export function TabPending() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return <span aria-hidden="true" className="tab-pending" />;
}
