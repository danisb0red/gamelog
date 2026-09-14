import Link from "next/link";
import type { ReleaseEntry } from "@/lib/games/types";
import { KIND_LABEL, displayPlatforms, formatDay } from "@/lib/releases";
import { WishlistButton } from "@/components/wishlist-button";
import { RelativeDay } from "./relative-day";

/**
 * The one release worth leading with.
 *
 * The countdown is the hook — "Tomorrow" reads as an event, a date reads as a
 * row in a table — but only the viewer's browser knows what day it is for
 * them, so it arrives client-side on top of an absolute date the server can
 * always render correctly.
 */
export function ReleaseSpotlight({
  entry,
  label,
  wishlisted,
  canWishlist,
}: {
  entry: ReleaseEntry;
  label: string;
  wishlisted: boolean;
  canWishlist: boolean;
}) {
  const { game } = entry;
  const kind = KIND_LABEL[entry.kind];

  return (
    <section className="rise-in flex items-end gap-5 sm:gap-8">
      <Link href={`/g/${game.slug}`} className="shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={game.coverUrl ?? ""}
          alt={game.name}
          className="cover cover-featured aspect-[3/4] w-[118px] rounded-[4px] bg-surface-2 object-cover xs:w-[136px] sm:w-48"
        />
      </Link>

      <div className="min-w-0 pb-1">
        <span className="hud-label">{label}</span>

        <RelativeDay
          day={entry.date}
          className="mt-3 block font-mono text-[13px] font-bold uppercase tracking-[0.2em] text-accent sm:text-sm"
        />

        <Link href={`/g/${game.slug}`} className="mt-1.5 block">
          <h2 className="font-display text-[26px] font-bold leading-[1.05] tracking-tight text-neutral-50 transition-colors hover:text-accent sm:text-5xl">
            {game.name}
          </h2>
        </Link>

        <p className="mt-2.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-neutral-400 sm:text-[11px]">
          {formatDay(entry.date, { weekday: "long", day: "numeric", month: "long" })}
          {kind && <span className="text-status-backlog"> · {kind}</span>}
        </p>

        <p className="mt-1.5 font-mono text-[10.5px] uppercase tracking-[0.12em] text-neutral-500">
          {displayPlatforms(entry.platforms).join("  ·  ")}
        </p>

        {canWishlist && (
          <div className="mt-4">
            <WishlistButton game={game} isWishlisted={wishlisted} />
          </div>
        )}
      </div>
    </section>
  );
}
