import Link from "next/link";
import { getGamePassInfo, type GamePassInfo } from "@/lib/games/gamepass";

/**
 * Availability differs by region and by plan, and the feed we read is the US
 * catalog — so every place this appears says so instead of implying it's global.
 */
const REGION_NOTE = "Game Pass catalog: US. Availability differs by region.";

type Candidate = { gameId: number; name: string; slug: string; coverUrl: string | null };

/**
 * Home: games from your wishlist, or your backlog / playing shelf, that are in
 * Game Pass's "leaving soon" list. The feed has no dates, so it never says when.
 * Renders nothing when there are none, and nothing if the lookup fails.
 */
export async function YourLeavingGamePass({ games }: { games: Candidate[] }) {
  if (games.length === 0) return null;
  const info = await getGamePassInfo(games.map((g) => g.gameId));
  const leaving = games.filter((g) => info.get(g.gameId)?.state === "leaving").slice(0, 3);
  if (leaving.length === 0) return null;

  return (
    <div
      className="rise-in mt-3 flex max-w-xl items-center gap-4 rounded-2xl border border-white/10 bg-surface-1/70 p-3.5 pr-5"
      title={REGION_NOTE}
    >
      <span className="flex shrink-0 -space-x-3">
        {leaving.map((g) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={g.gameId}
            src={g.coverUrl ?? ""}
            alt=""
            className="aspect-[3/4] w-9 rounded-[3px] bg-surface-2 object-cover ring-2 ring-surface-0"
          />
        ))}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-300">
          Leaving Game Pass soon
        </span>
        {leaving.map((g) => (
          <Link
            key={g.gameId}
            href={`/g/${g.slug}`}
            className="block truncate py-1 text-[14px] leading-snug text-neutral-100 hover:underline"
          >
            {g.name}
          </Link>
        ))}
        <span className="block font-mono text-[10px] uppercase tracking-[0.12em] text-neutral-600">
          Game Pass catalog: US
        </span>
      </span>
    </div>
  );
}

/** Game page: a quiet chip. `info` is null for games that aren't on Game Pass. */
export function GamePassChip({ info }: { info: GamePassInfo | null }) {
  if (!info) return null;
  const leaving = info.state === "leaving";
  return (
    <p className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1" title={REGION_NOTE}>
      <span
        className={`rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] ${
          leaving ? "border-accent/40 text-accent" : "border-white/10 text-neutral-400"
        }`}
      >
        {leaving ? "Leaving Game Pass soon" : "On Game Pass"}
      </span>
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-600">US catalog</span>
    </p>
  );
}
