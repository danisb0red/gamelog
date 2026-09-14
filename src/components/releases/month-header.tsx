"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { formatDay, shiftMonth } from "@/lib/releases";
import { useLocalToday } from "./relative-day";

function Chevron({ flip = false }: { flip?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={flip ? "rotate-180" : ""}>
      <path d="m14.5 6-6 6 6 6" />
    </svg>
  );
}

/**
 * Month title and navigation. Rendered outside the calendar's Suspense boundary
 * so the page has its heading and arrows immediately, even while a cold month
 * is still coming back from IGDB.
 *
 * Links carry the current filters: the calendar keeps them in the URL with
 * replaceState, and Next syncs that into useSearchParams.
 */
export function MonthHeader({ month }: { month: string }) {
  const params = useSearchParams();
  const today = useLocalToday();

  const href = (m: string) => {
    const p = new URLSearchParams(params.toString());
    p.set("month", m);
    return `/releases?${p}`;
  };

  const prev = shiftMonth(month, -1);
  const next = shiftMonth(month, 1);
  const thisMonth = today?.slice(0, 7);
  const arrow =
    "flex h-11 w-11 items-center justify-center rounded-full border border-neutral-800 text-neutral-300 transition hover:border-neutral-600 hover:text-neutral-50";

  return (
    <header className="flex items-end justify-between gap-4">
      <div className="min-w-0">
        {/* The year lives on the label line: beside the month it collided with
            the arrows on a phone ("September" alone is ~220px at this size). */}
        <span className="hud-label">Release calendar · {month.slice(0, 4)}</span>
        <h1 className="mt-3 font-display text-[40px] font-bold leading-[0.9] tracking-tight text-neutral-50 xs:text-[46px] sm:text-7xl">
          {formatDay(`${month}-01`, { month: "long" })}
        </h1>
        {thisMonth && thisMonth !== month && (
          <Link href={href(thisMonth)} className="mt-3 inline-block font-mono text-[11px] uppercase tracking-[0.15em] text-accent transition hover:brightness-125">
            Back to this month →
          </Link>
        )}
      </div>

      <nav className="flex shrink-0 gap-2 pb-1" aria-label="Change month">
        <Link href={href(prev)} className={arrow} aria-label={`Previous month, ${formatDay(`${prev}-01`, { month: "long" })}`}>
          <Chevron />
        </Link>
        <Link href={href(next)} className={arrow} aria-label={`Next month, ${formatDay(`${next}-01`, { month: "long" })}`}>
          <Chevron flip />
        </Link>
      </nav>
    </header>
  );
}
