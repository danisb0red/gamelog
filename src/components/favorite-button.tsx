"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type GameInput = {
  id: number;
  name: string;
  slug: string;
  coverUrl: string | null;
  releaseYear: number | null;
};

/** Heart toggle that adds/removes the game from the user's 4 favorites. */
export function FavoriteButton({
  game,
  isFavorited,
  favoritesFull,
}: {
  game: GameInput;
  isFavorited: boolean;
  favoritesFull: boolean; // 4 already, and this isn't one of them
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setBusy(true);
    setError(null);
    try {
      if (isFavorited) {
        await fetch(`/api/favorites?gameId=${game.id}`, { method: "DELETE" });
      } else {
        const res = await fetch("/api/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ game }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Could not favorite");
        }
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  const disabled = busy || (!isFavorited && favoritesFull);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggle}
        disabled={disabled}
        title={
          !isFavorited && favoritesFull
            ? "You already have 4 favorites"
            : isFavorited
              ? "Remove from favorites"
              : "Add to favorites"
        }
        className={`flex items-center gap-1.5 rounded-full border px-4 py-2.5 text-sm font-medium transition disabled:opacity-50 ${
          isFavorited
            ? "border-accent bg-accent/10 text-accent"
            : "border-neutral-800 hover:bg-surface-3"
        }`}
      >
        <span>{isFavorited ? "♥" : "♡"}</span>
        {isFavorited ? "Favorited" : "Favorite"}
      </button>
      {error && (
        <p className="absolute mt-1 text-xs text-status-dropped">{error}</p>
      )}
    </div>
  );
}
