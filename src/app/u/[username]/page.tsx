import { notFound } from "next/navigation";
import Link from "next/link";
import { ListCards } from "@/components/list-cards";
import { CreateListModal } from "@/components/create-list-modal";
import { Favorites } from "@/components/favorites";
import { Wishlist } from "@/components/wishlist";
import { Shelf, EmptyShelf } from "@/components/shelf";
import { GameCover } from "@/components/game-cover";
import {
  getProfileByUsername,
  getUserGames,
  getUserLists,
  getUserFavorites,
  getUserWishlist,
} from "@/lib/db/queries";
import { getUser } from "@/lib/auth";
import { getMessage } from "@/lib/personality";
import { PixelMemoryCard } from "@/components/pixel";

export const dynamic = "force-dynamic";

// No searchParams: the shelf filters moved to /u/[username]/shelf, and the old
// links that carried them are redirected in src/proxy.ts before this renders.
export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const profile = await getProfileByUsername(username);
  if (!profile) notFound();

  const [all, userLists, userFavorites, userWishlist, viewer] = await Promise.all([
    getUserGames(profile.id),
    getUserLists(profile.id),
    getUserFavorites(profile.id),
    getUserWishlist(profile.id),
    getUser(),
  ]);
  const isOwner = viewer?.id === profile.id;

  const finishedCount = all.filter((g) => g.status === "finished").length;

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

      <div className="mx-auto w-full max-w-6xl px-5 pb-16 sm:pb-20">
        {/* ── Identity card ──────────────────────────────────────────────
            A save-file header rather than a social-media profile: monogram
            plate, handle in mono, and the three headline numbers set large. */}
        <header className="pt-8 sm:pt-16">
          <span className="hud-label">Save file</span>

          <div className="mt-4 flex flex-wrap items-end gap-x-5 gap-y-5 sm:mt-5 sm:gap-x-7 sm:gap-y-6">
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center bg-accent font-display text-2xl font-bold text-accent-foreground sm:h-20 sm:w-20 sm:text-3xl"
              style={{ clipPath: "polygon(0 0,100% 0,100% 76%,76% 100%,0 100%)" }}
            >
              {(profile.displayName ?? profile.username).charAt(0).toUpperCase()}
            </div>

            <div className="min-w-0">
              <h1 className="font-display text-3xl font-bold tracking-tight text-neutral-50 sm:text-5xl">
                {profile.displayName ?? profile.username}
              </h1>
              <p className="mt-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-neutral-400">
                @{profile.username}
              </p>
            </div>

            {/* Wishlist sits beside the collection numbers but is not one of
                them: it counts games that aren't on the shelf. */}
            <div className="flex w-full gap-x-4 gap-y-5 sm:ml-auto sm:w-auto sm:flex-wrap sm:gap-x-9">
              {[
                { v: String(all.length), c: "games" },
                { v: String(rated.length), c: "rated" },
                { v: avg ? avg.toFixed(1) : "—", c: "average" },
                { v: String(userWishlist.length), c: "wishlist" },
              ].map((s) => (
                <div key={s.c} className="min-w-0 flex-1 sm:flex-none">
                  <p className="font-display text-2xl font-semibold leading-none text-neutral-100 sm:text-3xl">
                    {s.v}
                  </p>
                  <p className="mt-1.5 truncate font-mono text-[9px] uppercase tracking-[0.1em] text-neutral-400 sm:text-[10px] sm:tracking-[0.15em]">
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
          <div className="mt-6 border-t border-neutral-800/70 pt-5 sm:mt-8">
            <div className="flex flex-wrap items-start gap-x-10 gap-y-5">
              {/* The hiding has to happen on a wrapper. PixelMemoryCard hardcodes
                  `inline-block`, and Tailwind emits `.inline-block` *after*
                  `.hidden` in the same layer — so `hidden` on the glyph itself
                  silently loses and the mark stayed visible on phones. */}
              <span className="hidden sm:block">
                <PixelMemoryCard size={24} className="mt-1 shrink-0 text-neutral-700" />
              </span>

              <dl className="grid flex-1 grid-cols-2 gap-x-4 gap-y-4 sm:flex sm:flex-wrap sm:gap-x-10">
                {[
                  { k: "Last save", v: lastSave },
                  {
                    k: "Completed",
                    v: `${finishedCount} of ${all.length}`,
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
                  is pretending to be. Easy to never notice.

                  Same trap as the glyph above, for a different reason: `.reg-mark`
                  is unlayered CSS and sets its own `display`, so it beats any
                  Tailwind utility no matter the order. Hence the wrapper. */}
              <span className="ml-auto hidden sm:block" aria-hidden="true">
                <span className="reg-mark mt-1.5 text-neutral-700" />
              </span>
            </div>
          </div>

          <Link
            href={`/u/${profile.username}/diary`}
            className="mt-6 inline-block sm:mt-7 font-mono text-[11px] uppercase tracking-[0.15em] text-accent transition hover:brightness-125"
          >
            Read the diary →
          </Link>
        </header>

        <div className="rule-pixel mt-8 sm:mt-10" aria-hidden="true">
          <span />
        </div>

        <Favorites favorites={userFavorites} isOwner={isOwner} />

        {(userLists.length > 0 || isOwner) && (
          <section className="mb-10 sm:mb-12">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-display text-2xl font-semibold tracking-tight text-neutral-100">
                Lists
              </h2>
              {isOwner && <CreateListModal />}
            </div>
            <ListCards lists={userLists} />
          </section>
        )}

        <Wishlist games={userWishlist} isOwner={isOwner} />

        {/* The collection itself lives at /u/[username]/shelf now. This is the
            last few covers as a sign of life, not a browsable copy of it —
            already-fetched rows, so it costs no extra query. */}
        <Shelf
          title="Recently logged"
          action={
            all.length > 0
              ? { href: `/u/${profile.username}/shelf`, text: "Full shelf" }
              : undefined
          }
        >
          {all.length > 0 ? (
            all
              .slice(0, 12)
              .map((g, i) => (
                <GameCover key={g.gameId} game={g} size="sm" priorityIndex={i} />
              ))
          ) : (
            <EmptyShelf
              message={getMessage("empty.library")}
              hint="Search a game to add it to your shelf."
            />
          )}
        </Shelf>
      </div>
    </main>
  );
}
