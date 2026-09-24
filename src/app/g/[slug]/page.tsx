import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { gameProviderName } from "@/lib/games";
import { getGameCached, getGameSafe } from "@/lib/games/lookup";
import { GameJsonLd } from "@/components/json-ld";
import { NOINDEX, pageMetadata, truncate } from "@/lib/seo";
import { getMessage } from "@/lib/personality";
import { GameSigil } from "@/components/game-sigil";
import { PixelBubble } from "@/components/pixel";
import { db } from "@/lib/db";
import { games } from "@/lib/db/schema";
import { getUser } from "@/lib/auth";
import {
  getGameAggregate,
  getGameReviews,
  getUserLogForGame,
  getUserLists,
  getUserFavorites,
  isGameWishlisted,
} from "@/lib/db/queries";
import { StarRating } from "@/components/star-rating";
import { LogModal } from "@/components/log-modal";
import { AddToList } from "@/components/add-to-list";
import { FavoriteButton } from "@/components/favorite-button";
import { WishlistButton } from "@/components/wishlist-button";
import { Screenshots } from "@/components/screenshots";
import { RelatedGames } from "@/components/related-games";
import { GamePassChip } from "@/components/gamepass/gamepass";
import { getGamePassForGame } from "@/lib/games/gamepass";
import type { NamedRef } from "@/lib/games/types";

export const dynamic = "force-dynamic";

function Meta({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <dt className="hud-label">{label}</dt>
      <dd className="text-sm">{value}</dd>
    </div>
  );
}

/** Metadata row whose values are named entities, optionally linked to a page. */
function RefMeta({
  label,
  refs,
  linkPrefix,
}: {
  label: string;
  refs: NamedRef[];
  linkPrefix?: string;
}) {
  if (refs.length === 0) return null;
  return (
    <div>
      <dt className="hud-label">{label}</dt>
      <dd className="text-sm">
        {refs.map((r, i) => (
          <span key={r.slug || r.name}>
            {i > 0 && ", "}
            {linkPrefix ? (
              <Link href={`${linkPrefix}/${r.slug}`} className="hover:underline">
                {r.name}
              </Link>
            ) : (
              r.name
            )}
          </span>
        ))}
      </dd>
    </div>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const game = await getGameSafe(slug);
  // A missing game still answers 200 (loading.tsx has already sent headers),
  // so noindex is what keeps the not-found shell out of search results.
  if (!game) return { title: "Game not found", robots: NOINDEX };
  return pageMetadata({
    title: game.releaseYear ? `${game.name} (${game.releaseYear})` : game.name,
    description: game.description
      ? truncate(game.description)
      : `Ratings, reviews and logs for ${game.name} on GameLog.`,
    path: `/g/${game.slug}`,
    image: `/g/${game.slug}/opengraph-image`,
  });
}

export default async function GamePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const game = await getGameCached(slug);
  if (!game) notFound();

  // Lazily cache the game so logs/reviews can FK to it and it appears in lists.
  await db
    .insert(games)
    .values({
      id: game.id,
      slug: game.slug,
      name: game.name,
      coverUrl: game.coverUrl,
      releaseYear: game.releaseYear,
    })
    .onConflictDoUpdate({
      target: games.id,
      set: { name: game.name, coverUrl: game.coverUrl, syncedAt: new Date() },
    });

  const [user, aggregate, reviews, gamePass] = await Promise.all([
    getUser(),
    getGameAggregate(game.id),
    getGameReviews(game.id),
    getGamePassForGame(game.id),
  ]);
  const existing = user ? await getUserLogForGame(user.id, game.id) : null;
  const userLists = user ? await getUserLists(user.id) : [];
  const userFavorites = user ? await getUserFavorites(user.id) : [];
  const isFavorited = userFavorites.some((f) => f.gameId === game.id);
  const favoritesFull = userFavorites.length >= 4;
  const wishlisted = user ? await isGameWishlisted(user.id, game.id) : false;

  const titleBlock = (
    <div>
      <h1 className="font-display text-[22px] font-bold leading-tight tracking-tight text-neutral-50 sm:text-5xl">
        {game.name}
        {/* Visual easter egg: a pixel motif for games that have one.
            Unlabelled by design — recognising it is the reward. */}
        <GameSigil title={game.name} className="ml-3 -translate-y-1.5" />
      </h1>
      {game.releaseYear && (
        <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-500 sm:text-[11px] sm:tracking-[0.18em]">
          {game.releaseYear}
          {game.developers[0] && (
            <>
              <span className="text-neutral-700"> · </span>
              {game.developers[0].name}
            </>
          )}
        </p>
      )}
      <GamePassChip info={gamePass} />
    </div>
  );

  return (
    <main className="relative flex-1">
      <GameJsonLd game={game} aggregate={aggregate} />
      {/* The game's own art washes the top of its page — every game page is
          coloured differently, which is the cheapest possible way to make the
          site feel like it's about games rather than rows in a table. */}
      {/* Room light is always on; the artwork wash layers on top when present. */}
      <div className="ambient-warm" aria-hidden="true" />
      {game.coverUrl && (
        <div className="ambient" style={{ backgroundImage: `url(${game.coverUrl})` }} />
      )}

      <div className="mx-auto w-full max-w-5xl px-5 pb-16 pt-7 sm:pt-14">
        {/*
          Two different shapes, not one reflowed.

          Desktop is a cover column beside everything else. On a phone that
          leaves the right-hand column about 210px wide, which is too narrow for
          three rating blocks (they collided and ran off-screen) and for the
          action row (it stacked one button per line). So the phone layout puts
          the cover beside the *title only*, then gives ratings and actions the
          full width underneath. `titleBlock` is rendered into whichever slot is
          live at the current breakpoint — one of the two is always display:none,
          so only one reaches the accessibility tree.
        */}
        <div className="flex flex-col gap-6 sm:flex-row sm:gap-8">
          <div className="flex items-start gap-4 sm:block">
            {/* Cover, treated as the hero object: bigger, squarer, rim-lit. */}
            <div className="shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={game.coverUrl ?? ""}
                alt={game.name}
                className="cover cover-featured aspect-[3/4] w-[118px] rounded-[4px] bg-surface-2 object-cover xs:w-[136px] sm:w-56"
              />
            </div>
            <div className="min-w-0 flex-1 sm:hidden">{titleBlock}</div>
          </div>

          {/* Ratings + actions */}
          <div className="min-w-0 flex-1 space-y-5">
            <div className="hidden sm:block">{titleBlock}</div>

          <div className="grid grid-cols-3 items-start gap-x-3 gap-y-4 sm:flex sm:flex-wrap sm:gap-x-8">
            <div>
              <p className="hud-label">Community</p>
              <div className="mt-1.5">
              {aggregate.average != null ? (
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                  <StarRating value={aggregate.average} readOnly />
                  <span className="text-sm text-neutral-500">
                    {aggregate.average.toFixed(1)} ({aggregate.ratingCount})
                  </span>
                </div>
              ) : (
                <p className="text-[13px] text-neutral-500 sm:text-sm">Not yet rated</p>
              )}
              </div>
            </div>
            {game.externalRating != null && (
              <div>
                <p className="hud-label">{gameProviderName}</p>
                <p className="mt-1.5 font-mono text-lg font-bold text-neutral-200">
                  {game.externalRating.toFixed(1)}
                  <span className="text-sm font-normal text-neutral-600">/5</span>
                </p>
              </div>
            )}
            {game.metacritic != null && (
              <div>
                <p className="hud-label">Metacritic</p>
                <span
                  /* block, not inline-block: .hud-label is display:inline-flex,
                     so an inline sibling shares its line — the score sat on top
                     of the word METACRITIC at every width. */
                  className={`mt-1.5 block w-fit rounded-sm px-2 py-0.5 font-mono text-lg font-bold leading-tight text-black ${
                    game.metacritic >= 75
                      ? "bg-status-playing"
                      : game.metacritic >= 50
                        ? "bg-status-finished"
                        : "bg-status-dropped"
                  }`}
                >
                  {game.metacritic}
                </span>
              </div>
            )}
          </div>

          {user ? (
            <div className="flex flex-wrap items-center gap-3">
              <LogModal game={game} platforms={game.platforms} existing={existing} />
              <AddToList
                game={{
                  id: game.id,
                  name: game.name,
                  slug: game.slug,
                  coverUrl: game.coverUrl,
                  releaseYear: game.releaseYear,
                }}
                lists={userLists.map((l) => ({ id: l.id, title: l.title }))}
              />
              <FavoriteButton
                game={{
                  id: game.id,
                  name: game.name,
                  slug: game.slug,
                  coverUrl: game.coverUrl,
                  releaseYear: game.releaseYear,
                }}
                isFavorited={isFavorited}
                favoritesFull={favoritesFull}
              />
              <WishlistButton
                game={{
                  id: game.id,
                  name: game.name,
                  slug: game.slug,
                  coverUrl: game.coverUrl,
                  releaseYear: game.releaseYear,
                }}
                isWishlisted={wishlisted}
              />
              {existing && (
                <span className="text-sm text-neutral-500">
                  You: {existing.status}
                  {existing.rating ? ` · ${Number(existing.rating)}★` : ""}
                  {existing.platform ? ` · ${existing.platform}` : ""}
                </span>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="px-cut inline-block bg-accent px-5 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-accent-foreground transition hover:brightness-110"
            >
              Sign in to log this
            </Link>
          )}

          {/* Metadata */}
          <dl className="grid grid-cols-2 gap-4 pt-2 sm:grid-cols-3">
            <Meta label="Released" value={game.releaseDate} />
            <Meta
              label="Playtime"
              value={game.playtimeHours ? `~${game.playtimeHours}h` : null}
            />
            <Meta label="Genres" value={game.genres.join(", ") || null} />
            <Meta label="Platforms" value={game.platforms.join(", ") || null} />
            <RefMeta label="Developer" refs={game.developers} linkPrefix="/developer" />
            <RefMeta label="Publisher" refs={game.publishers} />
          </dl>
        </div>
      </div>

      {/* Description */}
      {game.description && (
        <section className="mt-8 max-w-3xl">
          <h2 className="mb-2 hud-label">About</h2>
          <p className="whitespace-pre-line text-sm leading-relaxed text-neutral-300">
            {game.description}
          </p>
        </section>
      )}

      {/* Screenshots */}
      {game.screenshots.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 hud-label">Screenshots</h2>
          <Screenshots images={game.screenshots} />
        </section>
      )}

      {/* Reviews */}
      <section className="mt-10">
        <h2 className="mb-3 flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.18em] text-neutral-400">
          <PixelBubble size={13} className="text-neutral-600" />
          Reviews
        </h2>
        {reviews.length === 0 ? (
          <p className="text-sm text-neutral-500">{getMessage("empty.reviews")}</p>
        ) : (
          <ul className="divide-y divide-neutral-800/70 border-y border-neutral-800/70">
            {reviews.map((r) => (
              <li key={r.id} className="py-5">
                <div className="mb-2 flex items-center gap-2.5">
                  <Link
                    href={`/u/${r.username}`}
                    className="font-mono text-[11px] uppercase tracking-[0.15em] text-neutral-400 hover:text-accent"
                  >
                    {r.displayName ?? r.username}
                  </Link>
                  {r.rating != null && (
                    <StarRating value={Number(r.rating)} readOnly />
                  )}
                </div>
                <p className="text-[15px] leading-relaxed text-neutral-300">{r.review}</p>
              </li>
            ))}
          </ul>
        )}
        </section>

        {/* Last thing on the page: once you're done reading about this game,
            the way out is another game. */}
        <RelatedGames games={game.similar} />
      </div>
    </main>
  );
}
