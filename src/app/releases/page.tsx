import type { Metadata } from "next";
import { Suspense } from "react";
import { getUser } from "@/lib/auth";
import { getUserGames, getUserWishlist } from "@/lib/db/queries";
import { loadReleases } from "@/lib/games/releases";
import type { ReleaseEntry } from "@/lib/games/types";
import {
  PLATFORM_FAMILIES,
  type PlatformFamily,
  addDays,
  formatDay,
  monthBounds,
  onePerGame,
  parseMonth,
  todayUtc,
} from "@/lib/releases";
import { MonthHeader } from "@/components/releases/month-header";
import { ReleaseCalendar, type CalendarView } from "@/components/releases/release-calendar";
import { ReleaseSpotlight } from "@/components/releases/release-spotlight";
import { CalendarSubscribe } from "@/components/releases/calendar-subscribe";
import { CalendarSkeleton } from "@/components/releases/calendar-skeleton";
import type { Mine } from "@/components/releases/release-row";

export const metadata: Metadata = { title: "Releases · GameLog" };
export const dynamic = "force-dynamic";

type Params = { month?: string; view?: string; platform?: string };

export default async function ReleasesPage({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const month = parseMonth(sp.month);
  const view: CalendarView = sp.view === "all" || sp.view === "yours" ? sp.view : "big";
  const family = (PLATFORM_FAMILIES.find((f) => f.key === sp.platform)?.key ?? null) as PlatformFamily | null;

  return (
    <main className="relative flex-1">
      <div className="ambient-warm" aria-hidden="true" />
      <div className="mx-auto w-full max-w-6xl px-5 pb-16 pt-8 sm:pt-14">
        <MonthHeader month={month} />
        {/* Keyed by month so changing month shows the skeleton again rather than
            leaving last month's releases on screen while the next one loads. */}
        <Suspense key={month} fallback={<CalendarSkeleton />}>
          <MonthReleases month={month} view={view} family={family} />
        </Suspense>
      </div>
    </main>
  );
}

async function MonthReleases({ month, view, family }: { month: string; view: CalendarView; family: PlatformFamily | null }) {
  const user = await getUser();
  const [wishlist, shelf] = user
    ? await Promise.all([getUserWishlist(user.id), getUserGames(user.id)])
    : [[], []];

  const mine: Record<number, Mine> = {};
  for (const g of shelf) mine[g.gameId] = "shelf";
  for (const g of wishlist) mine[g.gameId] = "wishlist";

  const { from, to } = monthBounds(month);
  const { entries, failed } = await loadReleases(from, to, Object.keys(mine).map(Number));

  const today = todayUtc();
  const spot = pickSpotlight(entries, month, today);

  return (
    <>
      {user && (
        <div className="mt-4">
          <CalendarSubscribe />
        </div>
      )}
      {spot?.entry.game.coverUrl && (
        <div className="ambient" style={{ backgroundImage: `url(${spot.entry.game.coverUrl})` }} />
      )}
      {spot && (
        <div className="mt-9 sm:mt-12">
          <ReleaseSpotlight
            entry={spot.entry}
            label={spot.label}
            wishlisted={mine[spot.entry.game.id] === "wishlist"}
            canWishlist={Boolean(user) && mine[spot.entry.game.id] !== "shelf"}
          />
        </div>
      )}
      <div className="mt-10 sm:mt-14">
        <ReleaseCalendar
          month={month}
          entries={entries}
          mine={mine}
          canWishlist={Boolean(user)}
          failed={failed}
          serverToday={today}
          initialView={view}
          initialFamily={family}
        />
      </div>
    </>
  );
}

/**
 * Lead with the most anticipated *launch*, not the most anticipated entry: a
 * years-old game arriving on PS5 can out-hype a new release and would make a
 * misleading headline. This week first, then the rest of the month.
 */
function pickSpotlight(entries: ReleaseEntry[], month: string, today: string) {
  const launches = onePerGame(entries).filter((e) => e.kind === "launch");
  const top = (list: ReleaseEntry[]) => list.reduce<ReleaseEntry | null>((b, e) => (!b || e.hype > b.hype ? e : b), null);
  const name = formatDay(`${month}-01`, { month: "long" });

  if (today.slice(0, 7) === month) {
    const week = top(launches.filter((e) => e.date >= today && e.date <= addDays(today, 6)));
    if (week) return { entry: week, label: "Biggest release this week" };
    const later = top(launches.filter((e) => e.date >= today));
    if (later) return { entry: later, label: `Still to come in ${name}` };
  }
  const any = top(launches);
  if (!any) return null;
  return { entry: any, label: month > today.slice(0, 7) ? `Biggest release in ${name}` : `Biggest release of ${name}` };
}
