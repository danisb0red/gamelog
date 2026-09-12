import { LoadingLine } from "@/components/loading-line";

/**
 * Home skeleton — and the reason tapping HOME feels instant.
 *
 * `/` is `force-dynamic` and fetches trending from IGDB, so it was taking ~0.8s
 * warm and 8s+ on a cold serverless instance. Without a `loading` file Next has
 * nothing to show during a navigation to a dynamic route: the old page just sat
 * there, unchanged, for seconds. On a phone that reads as a dropped tap, so you
 * tap again — which is exactly what was reported.
 *
 * With this file the route gets a Suspense boundary, the tab bar can prefetch
 * this shell, and the navigation commits immediately while the page streams in
 * behind it. Per the Next docs this is the preferred fix; `useLinkStatus` is for
 * the cases a route-level fallback can't cover.
 *
 * It doubles as the fallback for any route without its own `loading`, so the
 * shapes below are deliberately generic: a header block and a run of covers,
 * which is what nearly every page here opens with.
 */
export default function HomeLoading() {
  return (
    <main className="relative flex-1">
      <div className="ambient-warm" aria-hidden="true" />

      <div className="mx-auto w-full max-w-6xl px-5 pb-16 pt-8 sm:pt-14">
        {/* Identity block */}
        <div className="h-3 w-20 animate-pulse rounded bg-surface-2" />
        <div className="mt-5 h-9 w-56 animate-pulse rounded bg-surface-2 sm:h-12 sm:w-80" />
        <div className="mt-3 h-3 w-40 animate-pulse rounded bg-surface-2" />

        <div className="rule-pixel mt-8 sm:mt-10" aria-hidden="true">
          <span />
        </div>

        {/* A shelf: title, then covers running off the right edge. */}
        <div className="mt-8">
          <div className="h-6 w-44 animate-pulse rounded bg-surface-2" />
          <div className="mt-5 flex gap-4 overflow-hidden">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="w-[104px] shrink-0 space-y-2 sm:w-[150px]">
                <div className="aspect-[3/4] w-full animate-pulse rounded-[3px] bg-surface-2" />
                <div className="h-3 w-3/4 animate-pulse rounded bg-surface-2" />
              </div>
            ))}
          </div>
        </div>

        <LoadingLine className="mt-10" />
      </div>
    </main>
  );
}
