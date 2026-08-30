"use client"; // Error boundaries must be Client Components

import Link from "next/link";
import { useEffect } from "react";

/**
 * Game pages are entirely upstream-data driven, so when the games provider is
 * down there is no partial page worth rendering.
 *
 * This briefly read CONNECTION LOST / QUIT TO SHELF in letterspaced caps — the
 * interface performing rather than informing, at the one moment a person needs
 * plain information. It now says what broke, that it isn't their fault, and
 * what still works.
 *
 * Next 16: the recovery prop is `unstable_retry` (re-fetches and re-renders);
 * the old `reset` only clears error state and can't recover a Server Component.
 */
export default function GamePageError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("[game page]", error);
  }, [error]);

  return (
    <main className="relative flex flex-1 flex-col items-center justify-center px-5 py-28 text-center">
      <h1 className="font-display text-3xl font-bold tracking-tight text-neutral-100 sm:text-4xl">
        Couldn&apos;t load this game
      </h1>

      <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-neutral-400">
        The games database isn&apos;t responding. This is upstream of us — your
        shelf, diary and lists are unaffected.
      </p>

      <div className="mt-9 flex flex-wrap items-center justify-center gap-6">
        <button
          onClick={() => unstable_retry()}
          className="px-cut bg-accent px-5 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-accent-foreground transition hover:brightness-110"
        >
          Try again
        </button>
        <Link
          href="/"
          className="font-mono text-[11px] uppercase tracking-[0.15em] text-neutral-500 transition-colors hover:text-neutral-200"
        >
          Back home
        </Link>
      </div>
    </main>
  );
}
