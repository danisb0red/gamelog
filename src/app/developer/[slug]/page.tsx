import { notFound } from "next/navigation";
import Link from "next/link";
import { gameProvider } from "@/lib/games";
import { GAME_SORTS, type GameSort } from "@/lib/games/types";
import { SortSelect } from "@/components/sort-select";
import { getMessage } from "@/lib/personality";

export const dynamic = "force-dynamic";

const DEFAULT_SORT: GameSort = "-released";

export default async function DeveloperPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sort?: string }>;
}) {
  const { slug } = await params;
  const { sort } = await searchParams;
  const validSort = GAME_SORTS.some((s) => s.value === sort)
    ? (sort as GameSort)
    : DEFAULT_SORT;

  const dev = await gameProvider.getDeveloper(slug, validSort);
  if (!dev) notFound();

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="hud-label">Developer</p>
          <h1 className="text-2xl font-semibold tracking-tight">{dev.name}</h1>
        </div>
        <SortSelect current={validSort} />
      </header>

      {dev.games.length === 0 ? (
        <p className="text-sm text-neutral-500">{getMessage("empty.developer")}</p>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {dev.games.map((g) => (
            <li key={g.id}>
              <Link href={`/g/${g.slug}`} className="group block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={g.coverUrl ?? ""}
                  alt={g.name}
                  className="aspect-[3/4] w-full cover rounded-[3px] bg-surface-2 object-cover"
                />
                <p className="mt-1 line-clamp-2 text-sm font-medium">{g.name}</p>
                {g.releaseYear && (
                  <p className="text-xs text-neutral-500">{g.releaseYear}</p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
