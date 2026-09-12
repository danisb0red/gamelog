"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

/**
 * Account dropdown in the header.
 *
 * Deliberately short: your profile, and the way out. Every other destination
 * already has permanent navigation at every breakpoint.
 */
export function ProfileMenu({
  username,
  displayName,
}: {
  username: string;
  displayName: string | null;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const initial = (displayName ?? username).charAt(0).toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-900 text-sm font-medium text-white dark:bg-white dark:text-neutral-900"
        aria-label="Account menu"
      >
        {initial}
      </button>

      {open && (
        <div
          style={{ right: 0, left: "auto" }}
          className="absolute z-50 mt-2 w-48 max-w-[calc(100vw-1.5rem)] rounded-sm border border-neutral-800 bg-surface-2 p-1 shadow-2xl"
        >
          <div className="px-3 py-2">
            <p className="truncate text-sm font-medium">{displayName ?? username}</p>
            <p className="truncate text-xs text-neutral-500">@{username}</p>
          </div>
          <div className="my-1 h-px bg-surface-2" />
          <Link
            href={`/u/${username}`}
            onClick={() => setOpen(false)}
            className="block rounded-lg px-3 py-2 text-sm hover:bg-surface-2"
          >
            Profile
          </Link>
          {/* Only what isn't already one tap away. Home, Shelf and Diary are in
              the header nav above `md` and in the tab bar below it, so listing
              them here again made a five-item menu where three items were
              duplicates and the two that mattered were buried among them. */}
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="block w-full rounded-lg px-3 py-2 text-left text-sm text-status-dropped hover:bg-surface-3"
            >
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
