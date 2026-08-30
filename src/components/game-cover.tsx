import Link from "next/link";
import { STATUS_BADGE, STATUS_LABEL, type Status } from "@/lib/status";

export type CoverGame = {
  gameId?: number;
  id?: number;
  gameName?: string;
  name?: string;
  gameSlug?: string;
  slug?: string;
  coverUrl: string | null;
  releaseYear: number | null;
  status?: string | null;
  rating?: string | number | null;
};

const SIZES = {
  sm: "w-[104px]",
  md: "w-[150px]",
  lg: "w-[196px]",
  xl: "w-[250px]",
  /** Fills its grid cell — used by the collection grid, where the track sizes it. */
  full: "w-full",
} as const;

/**
 * A single piece of box art, treated as an object rather than a card.
 *
 * There is deliberately no panel, border or button around it: the artwork *is*
 * the card. Titles sit beneath in small type, so a shelf reads as a row of
 * spines rather than a grid of widgets — which is the whole difference between
 * "game library" and "dashboard".
 */
export function GameCover({
  game,
  size = "md",
  featured = false,
  showTitle = true,
  priorityIndex,
  platform,
  catalogNumber,
}: {
  game: CoverGame;
  size?: keyof typeof SIZES;
  featured?: boolean;
  showTitle?: boolean;
  /** Staggers the entry animation across a shelf. */
  priorityIndex?: number;
  /** Shown as small mono metadata beneath the title, when known. */
  platform?: string | null;
  /** Position in the collection, printed as a catalog number. */
  catalogNumber?: number;
}) {
  const name = game.gameName ?? game.name ?? "";
  const slug = game.gameSlug ?? game.slug ?? "";
  const status = (game.status ?? undefined) as Status | undefined;
  const rating = game.rating != null ? Number(game.rating) : null;

  return (
    <Link
      href={`/g/${slug}`}
      className={`group block ${SIZES[size]} ${priorityIndex !== undefined ? "rise-in" : ""}`}
      style={
        priorityIndex !== undefined
          ? { animationDelay: `${Math.min(priorityIndex, 8) * 45}ms` }
          : undefined
      }
      title={name}
    >
      {/* Two wrappers on purpose: the outer one lets the bloom spill *outside*
          the artwork (the cover clips its own overlays), and the lift lives on
          the inner one so the spine and pips travel with the art rather than
          staying put while it rises. */}
      <div className="px-brackets relative">
        {/* The cover lights the room around it, using its own art as the source. */}
        {game.coverUrl && (
          <span
            aria-hidden="true"
            className={`art-bloom ${featured ? "art-bloom-on" : ""}`}
            style={{ backgroundImage: `url(${game.coverUrl})` }}
          />
        )}

        <div
          className={`case cover ${featured ? "cover-featured" : ""} relative overflow-hidden rounded-[3px] bg-surface-2`}
        >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={game.coverUrl ?? ""}
          alt={name}
          loading="lazy"
          className="aspect-[3/4] w-full object-cover"
        />

        {/* Status pip, top-left, over the art. Reads as a shelf tag. */}
        {status && (
          <span
            className={`px-status ${status === "playing" ? "px-live" : ""} absolute left-1.5 top-1.5 z-[2] ${
              STATUS_BADGE[status] ?? "bg-neutral-500"
            }`}
            title={STATUS_LABEL[status] ?? status}
            aria-label={STATUS_LABEL[status] ?? status}
          />
        )}

          {/* Rating, bottom-right, only when rated. Mono so it reads as data. */}
          {rating != null && (
            <span className="pointer-events-none absolute bottom-1.5 right-1.5 z-[2] rounded-sm bg-black/75 px-1.5 py-0.5 font-mono text-[11px] font-bold leading-none text-accent backdrop-blur-sm">
              {rating.toFixed(1)}
            </span>
          )}
        </div>
      </div>

      {showTitle && (
        <div className="mt-2.5">
          {catalogNumber !== undefined && (
            <p className="mb-1 font-mono text-[9px] tracking-[0.2em] text-neutral-700 transition-colors group-hover:text-neutral-500">
              № {String(catalogNumber).padStart(3, "0")}
            </p>
          )}
          <p className="line-clamp-2 text-[13px] font-medium leading-snug text-neutral-200 transition-colors group-hover:text-accent">
            {name}
          </p>
          {(game.releaseYear || platform) && (
            <p className="mt-0.5 truncate font-mono text-[11px] text-neutral-500">
              {game.releaseYear}
              {game.releaseYear && platform && (
                <span className="text-neutral-700"> · </span>
              )}
              {platform}
            </p>
          )}
        </div>
      )}
    </Link>
  );
}
