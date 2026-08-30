import { notFound } from "next/navigation";
import Link from "next/link";
import { GamesGrid } from "@/components/games-grid";
import { StatusTabs } from "@/components/status-tabs";
import { ListCards } from "@/components/list-cards";
import { CreateListModal } from "@/components/create-list-modal";
import { Favorites } from "@/components/favorites";
import { PlatformFilter } from "@/components/platform-filter";
import {
  getProfileByUsername,
  getUserGames,
  getUserLists,
  getUserFavorites,
} from "@/lib/db/queries";
import { getUser } from "@/lib/auth";
import { STATUSES, isStatus } from "@/lib/status";
import { PixelMemoryCard } from "@/components/pixel";

export const dynamic = "force-dynamic";

export default async function ProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ status?: string; platform?: string }>;
}) {
  const { username } = await params;
  const { status, platform } = await searchParams;
  const profile = await getProfileByUsername(username);
  if (!profile) notFound();

  const [all, userLists, userFavorites, viewer] = await Promise.all([
    getUserGames(profile.id),
    getUserLists(profile.id),
    getUserFavorites(profile.id),
    getUser(),
  ]);
  const isOwner = viewer?.id === profile.id;

  // Distinct platforms this user has played on.
  const platformOptions = [...new Set(all.map((g) => g.platform).filter(Boolean))].sort() as string[];
  const activePlatform = platform && platformOptions.includes(platform) ? platform : "";

  // Apply the platform filter first, then derive status counts from that subset.
  const platformFiltered = activePlatform
    ? all.filter((g) => g.platform === activePlatform)
    : all;

  const counts: Record<string, number> = { all: platformFiltered.length };
  for (const s of STATUSES) counts[s] = 0;
  for (const g of platformFiltered) counts[g.status] = (counts[g.status] ?? 0) + 1;

  const active = isStatus(status) ? status : "all";
  const filtered =
    active === "all"
      ? platformFiltered
      : platformFiltered.filter((g) => g.status === active);

  const rated = all.filter((g) => g.rating != null);
  const avg =
    rated.length > 0
      ? rated.reduce((sum, g) => sum + Number(g.rating), 0) / rated.length
      : null;

  // Ambient wash from this user's top favourite — their profile is coloured by
  // the game they care most about.
  const identityArt = userFavorites[0]?.coverUrl ?? all[0]?.coverUrl ?? null;

  // ── Save-screen fields ───────────────────────────────────────────────────
  // `all` is ordered newest-first, so the head is the most recent log.
  const lastSave = all[0]
    ? new Date(all[0].loggedAt)
        .toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
        .toUpperCase()
    : "—";

  // Most-played platform, by number of logged games.
  const platformTally = new Map<string, number>();
  for (const g of all) {
    if (g.platform) platformTally.set(g.platform, (platformTally.get(g.platform) ?? 0) + 1);
  }
  const topPlatform =
    [...platformTally.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

  return (
    <main className="relative flex-1">
      {/* Room light is always on; the artwork wash layers on top when present. */}
      <div className="ambient-warm" aria-hidden="true" />
      {identityArt && (
        <div className="ambient" style={{ backgroundImage: `url(${identityArt})` }} />
      )}

      <div className="mx-auto w-full max-w-6xl px-5 pb-20">
        {/* ── Identity card ──────────────────────────────────────────────
            A save-file header rather than a social-media profile: monogram
            plate, handle in mono, and the three headline numbers set large. */}
        <header className="pt-16">
          <span className="hud-label">Save file</span>

          <div className="mt-5 flex flex-wrap items-end gap-x-7 gap-y-6">
            <div
              className="flex h-20 w-20 shrink-0 items-center justify-center bg-accent font-display text-3xl font-bold text-accent-foreground"
              style={{ clipPath: "polygon(0 0,100% 0,100% 76%,76% 100%,0 100%)" }}
            >
              {(profile.displayName ?? profile.username).charAt(0).toUpperCase()}
            </div>

            <div className="min-w-0">
              <h1 className="font-display text-4xl font-bold tracking-tight text-neutral-50 sm:text-5xl">
                {profile.displayName ?? profile.username}
              </h1>
              <p className="mt-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-neutral-400">
                @{profile.username}
              </p>
            </div>

            <div className="ml-auto flex gap-9">
              {[
                { v: String(all.length), c: "games" },
                { v: String(rated.length), c: "rated" },
                { v: avg ? avg.toFixed(1) : "—", c: "average" },
              ].map((s) => (
                <div key={s.c}>
                  <p className="font-display text-3xl font-semibold leading-none text-neutral-100">
                    {s.v}
                  </p>
                  <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-neutral-400">
                    {s.c}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/*
            Save-file details.

            The fields a save screen actually shows you — when, how far, where —
            computed from real logs, so this is information first and atmosphere
            second. The memory-card glyph is the only reference here and it is
            unlabelled on purpose: a small object sitting beside save data, for
            anyone who recognises it.
          */}
          <div className="mt-8 border-t border-neutral-800/70 pt-5">
            <div className="flex flex-wrap items-start gap-x-10 gap-y-5">
              <PixelMemoryCard size={24} className="mt-1 shrink-0 text-neutral-700" />

              <dl className="flex flex-wrap gap-x-10 gap-y-4">
                {[
                  { k: "Last save", v: lastSave },
                  {
                    k: "Completed",
                    v: `${counts.finished ?? 0} of ${all.length}`,
                  },
                  { k: "Most played on", v: topPlatform },
                ].map((f) => (
                  <div key={f.k}>
                    <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-400">
                      {f.k}
                    </dt>
                    <dd className="mt-1 font-mono text-[13px] text-neutral-300">{f.v}</dd>
                  </div>
                ))}
              </dl>

              {/* Print registration mark — an artefact from the manual this page
                  is pretending to be. Easy to never notice. */}
              <span
                className="reg-mark ml-auto mt-1.5 hidden text-neutral-700 sm:inline-block"
                aria-hidden="true"
              />
            </div>
          </div>

          <Link
            href={`/u/${profile.username}/diary`}
            className="mt-7 inline-block font-mono text-[11px] uppercase tracking-[0.15em] text-accent transition hover:brightness-125"
          >
            Read the diary →
          </Link>
        </header>

        <div className="rule-pixel mt-10" aria-hidden="true">
          <span />
        </div>

        <Favorites favorites={userFavorites} isOwner={isOwner} />

        {(userLists.length > 0 || isOwner) && (
          <section className="mb-12">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-display text-2xl font-semibold tracking-tight text-neutral-100">
                Lists
              </h2>
              {isOwner && <CreateListModal />}
            </div>
            <ListCards lists={userLists} />
          </section>
        )}

        <section>
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl font-semibold tracking-tight text-neutral-100">
                Shelf
                <span className="ml-2.5 font-mono text-sm font-normal text-neutral-500">
                  {String(filtered.length).padStart(2, "0")}
                </span>
              </h2>
            </div>
            <PlatformFilter platforms={platformOptions} current={activePlatform} />
          </div>

          <div className="mb-7">
            <StatusTabs
              username={profile.username}
              active={active}
              counts={counts}
              platform={activePlatform}
            />
          </div>

          <GamesGrid games={filtered} status={active} />
        </section>
      </div>
    </main>
  );
}
