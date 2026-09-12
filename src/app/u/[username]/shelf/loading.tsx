import { LoadingLine } from "@/components/loading-line";

/**
 * Shelf skeleton.
 *
 * Needed on its own: without it this route inherits the profile's boundary and
 * every tap on the Shelf tab flashes an identity header that never arrives.
 */
export default function ShelfLoading() {
  return (
    <main className="relative flex-1">
      <div className="ambient-warm" aria-hidden="true" />

      <div className="mx-auto w-full max-w-6xl px-5 pb-16 sm:pb-20">
        <header className="pt-8 sm:pt-16">
          <div className="h-4 w-32 animate-pulse rounded bg-surface-2" />
          <div className="mt-2.5 h-8 w-28 animate-pulse rounded bg-surface-2 sm:h-10" />
          <div className="mt-2.5 h-3 w-20 animate-pulse rounded bg-surface-2" />
        </header>

        {/* The status tabs, which arrive before any artwork does. */}
        <div className="mt-7 flex gap-x-6 border-b border-neutral-800/70 pb-3 sm:mt-9">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-3 w-14 animate-pulse rounded bg-surface-2" />
          ))}
        </div>

        {/* Same track as GamesGrid, so the covers don't jump when they land. */}
        <ul className="mt-7 grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-x-3 gap-y-6 sm:grid-cols-[repeat(auto-fill,minmax(132px,1fr))] sm:gap-x-5 sm:gap-y-7">
          {Array.from({ length: 12 }).map((_, i) => (
            <li key={i} className="min-w-0 space-y-2">
              <div className="aspect-[3/4] w-full animate-pulse rounded-[3px] bg-surface-2" />
              <div className="h-3 w-3/4 animate-pulse rounded bg-surface-2" />
            </li>
          ))}
        </ul>

        <LoadingLine className="mt-8" />
      </div>
    </main>
  );
}
