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

/**
 * Toggle that puts the game on the user's wishlist, or takes it off.
 *
 * It sits beside the log and favorite actions rather than inside the log form:
 * a wishlisted game has no rating, platform or date, so it is the alternative
 * to logging, not a kind of log.
 */
export function WishlistButton({
  game,
  isWishlisted,
}: {
  game: GameInput;
  isWishlisted: boolean;
}) {
  const router = useRouter();
  const [wished, setWished] = useState(isWishlisted);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    // Flip first: a wishlist add is one row and always succeeds or throws, so
    // waiting on the round trip only makes the button feel slow. Reverted below
    // if the write actually failed.
    const next = !wished;
    setWished(next);
    setBusy(true);
    setError(null);
    try {
      const res = next
        ? await fetch("/api/wishlist", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ game }),
          })
        : await fetch(`/api/wishlist?gameId=${game.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Could not update wishlist");
      }
      router.refresh();
    } catch (e) {
      setWished(!next);
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        aria-pressed={wished}
        title={wished ? "Remove from wishlist" : "Add to wishlist"}
        className={`flex items-center gap-1.5 rounded-full border px-4 py-2.5 text-sm font-medium transition disabled:opacity-50 ${
          wished
            ? "border-accent bg-accent/10 text-accent"
            : "border-neutral-800 hover:bg-surface-3"
        }`}
      >
        <span aria-hidden="true">{wished ? "✓" : "+"}</span>
        {wished ? "Wishlisted" : "Wishlist"}
      </button>
      {error && <p className="absolute mt-1 text-xs text-status-dropped">{error}</p>}
    </div>
  );
}
