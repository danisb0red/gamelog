import Link from "next/link";
import { loadReleases } from "@/lib/games/releases";
import { addDays, formatDay, onePerGame, todayUtc } from "@/lib/releases";
import { Shelf } from "@/components/shelf";
import { GameCover } from "@/components/game-cover";
import { RelativeDay } from "./relative-day";

/**
 * One 30-day window feeds both pieces below; loadReleases is request-cached,
 * so Home rendering both costs one load. Callers wrap each in Suspense — a
 * cold window is several IGDB pages.
 */
async function upcoming(gameIds: number[]) {
  const today = todayUtc();
  const { entries } = await loadReleases(today, addDays(today, 30), gameIds);
  return { today, unique: onePerGame(entries) };
}

/**
 * "Coming up from your games" — the reason to open Home on a day you haven't
 * played anything. Sits in the hero so it's above the fold on a phone; it
 * renders nothing when none of your games have a date.
 */
export async function YourUpcoming({ gameIds }: { gameIds: number[] }) {
  if (gameIds.length === 0) return null;
  const { unique } = await upcoming(gameIds);
  const ids = new Set(gameIds);
  const yours = unique.filter((e) => ids.has(e.game.id)).slice(0, 3);
  if (yours.length === 0) return null;

  return (
    <Link
      href="/releases?view=yours"
      className="rise-in group mt-6 flex max-w-xl items-center gap-4 rounded-2xl border border-accent/25 bg-accent/[0.06] p-3.5 pr-5 transition hover:border-accent/50"
    >
      <span className="flex shrink-0 -space-x-3">
        {yours.map((e) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={e.game.id}
            src={e.game.coverUrl ?? ""}
            alt=""
            className="aspect-[3/4] w-9 rounded-[3px] bg-surface-2 object-cover ring-2 ring-surface-0"
          />
        ))}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-mono text-[10px] uppercase tracking-[0.16em] text-accent">
          Coming up from your games
        </span>
        {yours.map((e) => (
          // Name on its own line: sharing it with the date truncated
          // "Marvel's Wolverine" to "Marvel's Wolv…" on a phone — the one
          // word in the card that matters.
          <span key={e.game.id} className="mt-1 block">
            <span className="block truncate text-[14px] leading-snug text-neutral-100">{e.game.name}</span>
            <span className="flex items-baseline gap-2 font-mono text-[10.5px] uppercase tracking-[0.1em]">
              <span className="text-neutral-500">{formatDay(e.date, { day: "numeric", month: "short" })}</span>
              <RelativeDay day={e.date} className="text-accent" />
            </span>
          </span>
        ))}
      </span>
      <span aria-hidden="true" className="text-accent transition-transform group-hover:translate-x-0.5">→</span>
    </Link>
  );
}

/** "Out this week" — the part of Home and the empty Search screen that changes without you. */
export async function OutThisWeek({ gameIds = [] }: { gameIds?: number[] }) {
  const { today, unique } = await upcoming(gameIds);

  // The week's most anticipated, then back into date order for reading.
  const week = unique
    .filter((e) => e.date < addDays(today, 7) && e.kind !== "re-release")
    .sort((a, b) => b.hype - a.hype)
    .slice(0, 14)
    .sort((a, b) => a.date.localeCompare(b.date) || b.hype - a.hype);

  if (week.length < 3) return null;

  return (
    <Shelf title="Out this week" action={{ href: "/releases", text: "Calendar" }}>
      {week.map((e, i) => (
        <GameCover
          key={e.game.id}
          game={e.game}
          size="sm"
          priorityIndex={i}
          caption={
            <span className="flex flex-wrap items-baseline gap-x-1.5 font-mono text-[10.5px] uppercase tracking-[0.1em]">
              <span className="text-neutral-500">{formatDay(e.date, { weekday: "short", day: "numeric" })}</span>
              <RelativeDay day={e.date} max={1} className="text-accent" />
            </span>
          }
        />
      ))}
    </Shelf>
  );
}

export function OutThisWeekSkeleton() {
  return (
    <div className="py-8">
      <div className="h-6 w-40 animate-pulse rounded bg-surface-2" />
      <div className="mt-5 flex gap-4 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="w-[104px] shrink-0 space-y-2">
            <div className="aspect-[3/4] animate-pulse rounded-[3px] bg-surface-2" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-surface-2" />
          </div>
        ))}
      </div>
    </div>
  );
}
