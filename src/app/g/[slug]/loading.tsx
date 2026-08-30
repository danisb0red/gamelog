import { LoadingLine } from "@/components/loading-line";

/**
 * Game page skeleton. Mirrors the real layout (cover left, title + meta right)
 * so the page doesn't jump when data lands.
 */
export default function GamePageLoading() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
      <div className="flex flex-col gap-6 sm:flex-row">
        <div className="shrink-0">
          <div className="aspect-[3/4] w-44 animate-pulse rounded-lg bg-surface-2" />
        </div>

        <div className="flex-1 space-y-4">
          <div className="space-y-2">
            <div className="h-7 w-2/3 animate-pulse rounded bg-surface-2" />
            <div className="h-4 w-16 animate-pulse rounded bg-surface-2" />
          </div>

          <div className="flex flex-wrap items-center gap-6 pt-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="space-y-1.5">
                <div className="h-3 w-20 animate-pulse rounded bg-surface-2" />
                <div className="h-4 w-12 animate-pulse rounded bg-surface-2" />
              </div>
            ))}
          </div>

          <div className="h-10 w-40 animate-pulse rounded-full bg-surface-2" />
          <LoadingLine className="pt-2" />
        </div>
      </div>
    </main>
  );
}
