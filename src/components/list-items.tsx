"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { getMessage, hashSeed } from "@/lib/personality";

type Item = {
  itemId: string;
  gameId: number;
  gameName: string;
  gameSlug: string;
  coverUrl: string | null;
  releaseYear: number | null;
};

export function ListItems({
  listId,
  items,
  isOwner,
  isRanked,
}: {
  listId: string;
  items: Item[];
  isOwner: boolean;
  isRanked: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function move(itemId: string, direction: "up" | "down") {
    setBusy(true);
    await fetch(`/api/lists/${listId}/items`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, direction }),
    });
    router.refresh();
    setBusy(false);
  }

  async function remove(itemId: string) {
    setBusy(true);
    await fetch(`/api/lists/${listId}/items?itemId=${itemId}`, { method: "DELETE" });
    router.refresh();
    setBusy(false);
  }

  if (items.length === 0) {
    return (
      <p className="py-10 text-sm text-neutral-500">
        {/* Seeded by list id, not by clock: this is a Client Component, and a
            time-based seed can land in a different bucket on the server render
            than on hydration. Per-list is stable and still varies list to list. */}
        {getMessage("empty.listItems", hashSeed(listId))}{" "}
        {isOwner && "Open a game's page and use “Add to list” to put it here."}
      </p>
    );
  }

  return (
    <ul className="divide-y divide-neutral-800/70">
      {items.map((it, i) => (
        <li key={it.itemId} className="flex items-center gap-3 py-3">
          {isRanked && (
            <span className="w-6 shrink-0 text-center text-lg font-semibold tabular-nums text-neutral-400">
              {i + 1}
            </span>
          )}
          <Link href={`/g/${it.gameSlug}`} className="shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={it.coverUrl ?? ""}
              alt=""
              className="h-16 w-12 rounded bg-surface-2 object-cover"
            />
          </Link>
          <Link
            href={`/g/${it.gameSlug}`}
            className="min-w-0 flex-1 text-sm font-medium hover:underline"
          >
            <span className="line-clamp-1">{it.gameName}</span>
            {it.releaseYear && (
              <span className="block text-xs font-normal text-neutral-500">
                {it.releaseYear}
              </span>
            )}
          </Link>

          {isOwner && (
            <div className="flex shrink-0 items-center gap-1 text-neutral-400">
              {isRanked && (
                <>
                  <button
                    type="button"
                    disabled={busy || i === 0}
                    onClick={() => move(it.itemId, "up")}
                    className="rounded p-1 hover:bg-surface-3 disabled:opacity-30"
                    aria-label="Move up"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    disabled={busy || i === items.length - 1}
                    onClick={() => move(it.itemId, "down")}
                    className="rounded p-1 hover:bg-surface-3 disabled:opacity-30"
                    aria-label="Move down"
                  >
                    ↓
                  </button>
                </>
              )}
              <button
                type="button"
                disabled={busy}
                onClick={() => remove(it.itemId)}
                className="rounded p-1 text-status-dropped hover:bg-surface-3 disabled:opacity-30"
                aria-label="Remove"
              >
                ✕
              </button>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
