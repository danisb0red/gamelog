"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Favorite = {
  gameId: number;
  gameName: string;
  gameSlug: string;
  coverUrl: string | null;
};

/** The "four favorites" row at the top of a profile, with an edit mode to remove. */
export function Favorites({
  favorites,
  isOwner,
}: {
  favorites: Favorite[];
  isOwner: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  async function remove(gameId: number) {
    setBusy(true);
    await fetch(`/api/favorites?gameId=${gameId}`, { method: "DELETE" });
    router.refresh();
    setBusy(false);
  }

  if (favorites.length === 0 && !isOwner) return null;

  /**
   * The four favourites, presented as fixed slots.
   *
   * Empty slots are drawn rather than hidden, numbered 01–04 in mono. Seeing
   * the gaps is the point: an unfilled slot is an invitation, and it makes the
   * four-game limit feel like a deliberate constraint you're curating against
   * rather than an arbitrary cap.
   */
  const slots = [0, 1, 2, 3];

  return (
    <section className="mb-10 py-2 sm:mb-12">
      <div className="mb-5 flex items-end justify-between">
        <h2 className="font-display text-2xl font-semibold tracking-tight text-neutral-100">
          Favorites
        </h2>
        {isOwner && favorites.length > 0 && (
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className="font-mono text-[11px] uppercase tracking-[0.15em] text-neutral-400 transition-colors hover:text-accent"
          >
            {editing ? "Done" : "Edit"}
          </button>
        )}
      </div>

      <div className="grid max-w-2xl grid-cols-4 gap-3.5 sm:gap-5">
        {slots.map((i) => {
          const fav = favorites[i];

          if (!fav) {
            return (
              <div
                key={`empty-${i}`}
                className="flex aspect-[3/4] items-center justify-center rounded-[3px] border border-dashed border-neutral-800"
              >
                <span className="font-mono text-xs text-neutral-700">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
            );
          }

          return (
            <div key={fav.gameId} className="group relative">
              <Link href={editing ? "" : `/g/${fav.gameSlug}`} title={fav.gameName}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={fav.coverUrl ?? ""}
                  alt={fav.gameName}
                  style={{ aspectRatio: "3 / 4" }}
                  className="cover w-full rounded-[3px] bg-surface-2 object-cover"
                />
              </Link>
              {editing && isOwner && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => remove(fav.gameId)}
                  className="absolute inset-0 flex items-center justify-center rounded-[3px] bg-black/60 text-white transition hover:bg-black/75"
                  aria-label={`Remove ${fav.gameName}`}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-status-dropped text-lg leading-none text-black">
                    ✕
                  </span>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {favorites.length === 0 && (
        <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.15em] text-neutral-600">
          Four slots. Choose carefully.
        </p>
      )}
    </section>
  );
}
