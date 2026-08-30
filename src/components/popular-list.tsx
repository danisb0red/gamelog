import Link from "next/link";

type Game = {
  id: number;
  name: string;
  slug: string;
  coverUrl: string | null;
  releaseYear: number | null;
};

/**
 * Trending, as a chart.
 *
 * Deliberately the densest block on the homepage: oversized mono rank numerals,
 * small art, tight rows. It's the counterweight to the airy shelves above it —
 * if every section breathed the same amount the page would have no rhythm.
 */
export function PopularList({ games }: { games: Game[] }) {
  if (games.length === 0) {
    return (
      <div className="rounded-sm border border-dashed border-neutral-800 px-4 py-8 text-center">
        <p className="font-display text-sm text-neutral-300">Can&apos;t load trending</p>
        <p className="mt-1.5 font-mono text-[11px] leading-relaxed text-neutral-600">
          The games database isn&apos;t responding.
          <br />
          Your shelf still works.
        </p>
      </div>
    );
  }

  return (
    <ol className="divide-y divide-neutral-800/70 border-y border-neutral-800/70">
      {games.map((g, i) => (
        <li key={g.id}>
          <Link href={`/g/${g.slug}`} className="group flex items-center gap-3.5 py-2.5">
            <span className="w-6 shrink-0 text-right font-mono text-base font-bold tabular-nums text-neutral-700 transition-colors group-hover:text-accent">
              {i + 1}
            </span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={g.coverUrl ?? ""}
              alt=""
              loading="lazy"
              className="cover h-14 w-10 shrink-0 rounded-[2px] bg-surface-2 object-cover"
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-neutral-200 transition-colors group-hover:text-accent">
                {g.name}
              </span>
              {g.releaseYear && (
                <span className="mt-0.5 block font-mono text-[11px] text-neutral-500">
                  {g.releaseYear}
                </span>
              )}
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
