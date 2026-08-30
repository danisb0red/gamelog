import { LoadingLine } from "@/components/loading-line";

/** Profile skeleton: avatar + name, then the cover grid. */
export default function ProfileLoading() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
      <header className="mb-8 flex items-center gap-4">
        <div className="h-16 w-16 animate-pulse rounded-full bg-surface-2" />
        <div className="space-y-2">
          <div className="h-5 w-40 animate-pulse rounded bg-surface-2" />
          <div className="h-3 w-24 animate-pulse rounded bg-surface-2" />
        </div>
      </header>

      <ul className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <li key={i} className="space-y-1.5">
            <div className="aspect-[3/4] w-full animate-pulse rounded-lg bg-surface-2" />
            <div className="h-3 w-3/4 animate-pulse rounded bg-surface-2" />
          </li>
        ))}
      </ul>

      <LoadingLine className="mt-8" />
    </main>
  );
}
