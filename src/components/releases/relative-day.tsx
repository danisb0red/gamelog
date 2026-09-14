"use client";

import { useSyncExternalStore } from "react";
import { daysBetween, relativeLabel } from "@/lib/releases";

function localDayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Re-render once at the viewer's local midnight, so "Tomorrow" becomes "Today". */
function subscribe(onChange: () => void) {
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const t = setTimeout(onChange, midnight.getTime() - now.getTime() + 500);
  return () => clearTimeout(t);
}

/**
 * The viewer's own calendar date, or null during server render.
 *
 * "Today" is the one thing the server cannot know — it has no idea what
 * timezone you're in. useSyncExternalStore renders the server snapshot (null)
 * through hydration and then switches, which is React's supported way to do
 * this without a hydration mismatch or a setState-in-effect.
 */
export function useLocalToday(): string | null {
  return useSyncExternalStore(subscribe, localDayKey, () => null);
}

export function RelativeDay({ day, className = "", max = 14 }: { day: string; className?: string; max?: number }) {
  const today = useLocalToday();
  const label = today && Math.abs(daysBetween(today, day)) <= max ? relativeLabel(day, today) : null;
  if (!label) return null;
  return <span className={className}>{label}</span>;
}
