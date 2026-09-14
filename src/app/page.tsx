import Link from "next/link";
import { Suspense } from "react";
import { OutThisWeek, OutThisWeekSkeleton, YourUpcoming } from "@/components/releases/out-this-week";
import { ActivityTimeline } from "@/components/activity-timeline";
import { PopularList } from "@/components/popular-list";
import { GameCover } from "@/components/game-cover";
import { Shelf, EmptyShelf } from "@/components/shelf";
import { StatStrip } from "@/components/stat-strip";
import {
  getRecentLogs,
  getCurrentlyPlaying,
  getUserGames,
  getProfileById,
  getUserWishlist,
} from "@/lib/db/queries";
import { getUser, ensureProfile } from "@/lib/auth";
import { getTrendingOrPopular } from "@/lib/games/trending";
import { getMessage } from "@/lib/personality";
import { PixelController } from "@/components/pixel";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getUser();

  // ── Signed out: a cinematic cover wall, not a centred paragraph. ──────────
  if (!user) {
    const popular = await getTrendingOrPopular(12);
    const art = popular[0]?.coverUrl ?? null;

    return (
      <main className="relative flex-1">
        {/* Room light is always on; the artwork wash layers on top when present. */}
      <div className="ambient-warm" aria-hidden="true" />
      {art && <div className="ambient" style={{ backgroundImage: `url(${art})` }} />}

        <div className="mx-auto w-full max-w-6xl px-5 pb-16 pt-24">
          <h1 className="max-w-3xl font-display text-5xl font-bold leading-[0.95] tracking-tight text-neutral-50 sm:text-7xl">
            Every game you&apos;ve
            <br />
            ever played.
          </h1>
          <p className="mt-6 max-w-md text-[15px] leading-relaxed text-neutral-400">
            Keep a record of what you play, rate it, and write it down. Your shelf
            builds itself.
          </p>

          <div className="mt-9 flex items-center gap-5">
            <Link
              href="/login"
              className="px-cut bg-accent px-6 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-accent-foreground transition hover:brightness-110"
            >
              Start your log
            </Link>
            <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-neutral-600">
              Free · No ads
            </span>
          </div>

          <div className="mt-16">
            <Suspense fallback={<OutThisWeekSkeleton />}>
              <OutThisWeek />
            </Suspense>
          </div>

          {popular.length > 0 && (
            <div className="mt-8">
              <Shelf title="What people are playing">
                {popular.map((g, i) => (
                  <GameCover key={g.id} game={g} size="md" priorityIndex={i} />
                ))}
              </Shelf>
            </div>
          )}
        </div>
      </main>
    );
  }

  // ── Signed in ────────────────────────────────────────────────────────────
  await ensureProfile(user);
  const [playing, entries, popular, allGames, profile, wishlist] = await Promise.all([
    getCurrentlyPlaying(user.id),
    getRecentLogs(user.id, 12),
    getTrendingOrPopular(10),
    getUserGames(user.id),
    getProfileById(user.id),
    getUserWishlist(user.id),
  ]);
  const myGameIds = [...new Set([...allGames.map((g) => g.gameId), ...wishlist.map((g) => g.gameId)])];

  // The hero's ambient wash comes from whatever you're playing right now, so the
  // page is literally coloured by your current game. Falls back to trending.
  const heroArt = playing[0]?.coverUrl ?? popular[0]?.coverUrl ?? null;
  const name = profile?.displayName || profile?.username || "player";

  return (
    <main className="relative flex-1">
      {/* Room light is always on; the artwork wash layers on top when present. */}
      <div className="ambient-warm" aria-hidden="true" />
      {heroArt && <div className="ambient" style={{ backgroundImage: `url(${heroArt})` }} />}

      <div className="mx-auto w-full max-w-6xl px-5 pb-20">
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <header className="pb-6 pt-16">
          <span className="hud-label">Save file</span>
          <h1 className="mt-4 font-display text-4xl font-bold tracking-tight text-neutral-50 sm:text-6xl">
            {name}
            <span className="text-accent">.</span>
          </h1>
          <p className="mt-3 flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.18em] text-neutral-500">
            <PixelController size={15} className="text-neutral-600" />
            {allGames.length} games on the shelf
          </p>
          <Suspense fallback={null}>
            <YourUpcoming gameIds={myGameIds} />
          </Suspense>
        </header>

        <div className="rule-pixel" aria-hidden="true">
          <span />
        </div>

        {/* ── Continue: the largest artwork on the page ─────────────────── */}
        <Shelf
          title="Currently playing"
          count={playing.length || undefined}
          action={profile ? { href: `/u/${profile.username}/shelf`, text: "Full shelf" } : undefined}
        >
          {playing.length > 0 ? (
            playing.map((g, i) => (
              <GameCover
                key={g.gameId}
                game={g}
                size="xl"
                featured={i === 0}
                priorityIndex={i}
              />
            ))
          ) : (
            <EmptyShelf
              message={getMessage("empty.playing")}
              hint="Set a game to Playing and it appears here."
            />
          )}
        </Shelf>

        {/* ── What's coming: the part of Home that changes without you ──── */}
        <Suspense fallback={<OutThisWeekSkeleton />}>
          <OutThisWeek gameIds={myGameIds} />
        </Suspense>

        {/* ── Collection: typographic, lets the page breathe ────────────── */}
        <StatStrip games={allGames} />

        <div className="rule-pixel" aria-hidden="true">
          <span />
        </div>

        {/* ── Dense row: journal beside the chart ───────────────────────── */}
        <div className="grid gap-12 pt-10 lg:grid-cols-[1.7fr_1fr] lg:gap-16">
          <section>
            <h2 className="mb-6 font-display text-2xl font-semibold tracking-tight text-neutral-100">
              Recent activity
            </h2>
            <ActivityTimeline entries={entries} />
          </section>

          <aside>
            <h2 className="mb-6 font-display text-2xl font-semibold tracking-tight text-neutral-100">
              Trending
            </h2>
            <PopularList games={popular} />
            <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.15em] text-neutral-600">
              Most-played on Steam right now
            </p>
          </aside>
        </div>
      </div>
    </main>
  );
}
