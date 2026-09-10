"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GameCover } from "./game-cover";

type WishlistGame = {
  gameId: number;
  gameName: string;
  gameSlug: string;
  coverUrl: string | null;
  releaseYear: number | null;
};

/**
 * The wishlist section on a profile.
 *
 * Its own section, never a tab in ShelfBrowser: these games aren't on the
 * shelf, haven't been played, and must not be counted with the ones that have.
 * The covers carry no status pip or catalog number for the same reason —
 * there's nothing logged to report.
 */
export function Wishlist({
  games,
  isOwner,
}: {
  games: WishlistGame[];
  isOwner: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  async function remove(gameId: number) {
    setBusy(true);
    try {
      await fetch(`/api/wishlist?gameId=${gameId}`, { method: "DELETE" });
      router.refresh();
    } finally {
      // Without the finally, a dropped connection leaves `busy` stuck true and
      // every remove button in the section disabled until a reload.
      setBusy(false);
    }
  }

  if (games.length === 0 && !isOwner) return null;

  return (
    <section className="mb-12">
      <div className="mb-5 flex items-end justify-between">
        <h2 className="font-display text-2xl font-semibold tracking-tight text-neutral-100">
          Wishlist
          <span className="ml-2.5 font-mono text-sm font-normal text-neutral-500">
            {String(games.length).padStart(2, "0")}
          </span>
        </h2>
        {isOwner && games.length > 0 && (
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className="font-mono text-[11px] uppercase tracking-[0.15em] text-neutral-400 transition-colors hover:text-accent"
          >
            {editing ? "Done" : "Edit"}
          </button>
        )}
      </div>

      {games.length === 0 ? (
        <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-neutral-600">
          Add games from any game page.
        </p>
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(112px,1fr))] gap-x-5 gap-y-7 sm:grid-cols-[repeat(auto-fill,minmax(132px,1fr))]">
          {games.map((g) => (
            <li key={g.gameId} className="relative min-w-0">
              <GameCover game={g} size="full" />
              {editing && isOwner && (
                // Covers only the artwork, not the title beneath it, and sits
                // over the cover's link so a click removes rather than navigates.
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => remove(g.gameId)}
                  className="absolute inset-x-0 top-0 flex aspect-[3/4] items-center justify-center rounded-[3px] bg-black/60 text-white transition hover:bg-black/75"
                  aria-label={`Remove ${g.gameName} from wishlist`}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-status-dropped text-lg leading-none text-black">
                    ✕
                  </span>
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
