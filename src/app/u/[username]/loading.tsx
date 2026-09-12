import { LoadingLine } from "@/components/loading-line";

/**
 * Profile skeleton: the identity header and the favourites row beneath it.
 *
 * It used to draw a round avatar and a twelve-cover grid — neither of which the
 * page renders any more now that the collection has moved to /shelf.
 */
export default function ProfileLoading() {
  return (
    <main className="relative flex-1">
      <div className="ambient-warm" aria-hidden="true" />

      <div className="mx-auto w-full max-w-6xl px-5 pb-16 sm:pb-20">
        <header className="pt-8 sm:pt-16">
          <div className="h-3 w-20 animate-pulse rounded bg-surface-2" />

          <div className="mt-4 flex flex-wrap items-end gap-x-5 gap-y-5 sm:mt-5 sm:gap-x-7 sm:gap-y-6">
            {/* Square, not a circle: the monogram plate is a clipped block. */}
            <div className="h-14 w-14 shrink-0 animate-pulse bg-surface-2 sm:h-20 sm:w-20" />

            <div className="space-y-2.5">
              <div className="h-8 w-44 animate-pulse rounded bg-surface-2 sm:h-11 sm:w-64" />
              <div className="h-3 w-24 animate-pulse rounded bg-surface-2" />
            </div>

            <div className="flex w-full gap-x-4 sm:ml-auto sm:w-auto sm:gap-x-9">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex-1 space-y-2 sm:flex-none">
                  <div className="h-6 w-10 animate-pulse rounded bg-surface-2" />
                  <div className="h-2.5 w-14 animate-pulse rounded bg-surface-2" />
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 border-t border-neutral-800/70 pt-5 sm:mt-8">
            <div className="flex flex-wrap gap-x-10 gap-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-2.5 w-20 animate-pulse rounded bg-surface-2" />
                  <div className="h-3 w-24 animate-pulse rounded bg-surface-2" />
                </div>
              ))}
            </div>
          </div>
        </header>

        {/* Four favourite slots — the first thing under the header. */}
        <div className="mt-10 grid max-w-2xl grid-cols-4 gap-3.5 sm:gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[3/4] w-full animate-pulse rounded-[3px] bg-surface-2"
            />
          ))}
        </div>

        <LoadingLine className="mt-10" />
      </div>
    </main>
  );
}
