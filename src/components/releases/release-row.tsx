"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ReleaseEntry } from "@/lib/games/types";
import { KIND_LABEL, displayPlatforms } from "@/lib/releases";

export type Mine = "wishlist" | "shelf" | null;

/**
 * One release in the agenda.
 *
 * The wishlist toggle lives on the row because the calendar is where you
 * decide you want something: seeing a game is coming out and having to open
 * its page to save it is the same tedium the list page just got rid of.
 */
export function ReleaseRow({
  entry,
  mine,
  canWishlist,
  index,
}: {
  entry: ReleaseEntry;
  mine: Mine;
  canWishlist: boolean;
  index: number;
}) {
  const { game } = entry;
  const kind = KIND_LABEL[entry.kind];
  const platforms = displayPlatforms(entry.platforms);
  const shown = platforms.slice(0, 4);

  return (
    <li
      className="rise-in group relative grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-3.5 py-3 sm:grid-cols-[64px_minmax(0,1fr)_auto] sm:gap-4"
      style={{ animationDelay: `${Math.min(index, 10) * 35}ms` }}
    >
      <Link href={`/g/${game.slug}`} className="relative block" tabIndex={-1} aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={game.coverUrl ?? ""}
          alt=""
          loading="lazy"
          className={`aspect-[3/4] w-full rounded-[3px] bg-surface-2 object-cover transition-transform duration-300 group-hover:-translate-y-0.5 ${
            mine ? "ring-2 ring-accent ring-offset-2 ring-offset-surface-0" : ""
          }`}
        />
      </Link>

      <div className="min-w-0">
        <Link
          href={`/g/${game.slug}`}
          className="line-clamp-2 text-[15px] font-medium leading-snug text-neutral-100 transition-colors hover:text-accent"
        >
          {game.name}
        </Link>

        <div className="mt-1.5 flex flex-wrap items-center gap-1">
          {shown.map((p) => (
            <span
              key={p}
              className="rounded-sm border border-neutral-800 px-1.5 py-px font-mono text-[9.5px] uppercase tracking-[0.08em] text-neutral-400"
            >
              {p}
            </span>
          ))}
          {platforms.length > shown.length && (
            <span className="font-mono text-[9.5px] text-neutral-600">+{platforms.length - shown.length}</span>
          )}
        </div>

        {(mine || kind || entry.edition || entry.region) && (
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[10px] uppercase tracking-[0.1em]">
            {mine && (
              <span className="text-accent">{mine === "wishlist" ? "On your wishlist" : "On your shelf"}</span>
            )}
            {kind && <span className="text-status-backlog">{kind}</span>}
            {entry.edition && <span className="text-neutral-500">{entry.edition}</span>}
            {entry.region && <span className="text-neutral-500">{entry.region} only</span>}
          </p>
        )}
      </div>

      {canWishlist && mine !== "shelf" && <WishlistToggle entry={entry} initial={mine === "wishlist"} />}
    </li>
  );
}

function WishlistToggle({ entry, initial }: { entry: ReleaseEntry; initial: boolean }) {
  const router = useRouter();
  const [on, setOn] = useState(initial);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    const next = !on;
    setOn(next); // optimistic: one row, near-certain to succeed
    setBusy(true);
    try {
      const res = next
        ? await fetch("/api/wishlist", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ game: entry.game }),
          })
        : await fetch(`/api/wishlist?gameId=${entry.game.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(String(res.status));
      router.refresh();
    } catch {
      setOn(!next);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed={on}
      aria-label={on ? `Remove ${entry.game.name} from wishlist` : `Add ${entry.game.name} to wishlist`}
      className={`flex h-9 w-9 items-center justify-center rounded-full border transition ${
        on
          ? "border-accent bg-accent/15 text-accent"
          : "border-neutral-800 text-neutral-500 hover:border-neutral-600 hover:text-neutral-200"
      }`}
    >
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
        <path d="M6.5 3.5h11a1 1 0 0 1 1 1V21l-6.5-4.5L5.5 21V4.5a1 1 0 0 1 1-1z" />
      </svg>
    </button>
  );
}
