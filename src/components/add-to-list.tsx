"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type GameInput = {
  id: number;
  name: string;
  slug: string;
  coverUrl: string | null;
  releaseYear: number | null;
};

/** Dropdown to add the current game to one of the user's lists, or a new one. */
export function AddToList({
  game,
  lists,
}: {
  game: GameInput;
  lists: { id: string; title: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [newTitle, setNewTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function addToList(listId: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/lists/${listId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ game }),
      });
      if (res.ok) setAdded((s) => new Set(s).add(listId));
    } finally {
      setBusy(false);
    }
  }

  async function createAndAdd() {
    if (!newTitle.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      });
      const data = await res.json();
      if (res.ok) {
        await addToList(data.list.id);
        setNewTitle("");
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-full border border-neutral-800 px-4 py-2.5 text-sm font-medium transition hover:bg-surface-3"
      >
        + Add to list
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-64 rounded-sm border border-neutral-800 bg-surface-2 p-1 shadow-2xl">
          <div className="max-h-56 overflow-y-auto">
            {lists.length === 0 && (
              <p className="px-3 py-2 text-sm text-neutral-500">No lists yet.</p>
            )}
            {lists.map((l) => (
              <button
                key={l.id}
                type="button"
                disabled={busy || added.has(l.id)}
                onClick={() => addToList(l.id)}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-surface-3 disabled:opacity-60"
              >
                <span className="truncate">{l.title}</span>
                {added.has(l.id) && <span className="text-green-600">✓</span>}
              </button>
            ))}
          </div>
          <div className="my-1 h-px bg-surface-2" />
          <div className="flex gap-1 p-1">
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createAndAdd()}
              placeholder="New list…"
              className="min-w-0 flex-1 rounded-lg border border-neutral-800 bg-surface-1 px-2 py-1.5 text-sm outline-none focus:border-accent"
            />
            <button
              type="button"
              onClick={createAndAdd}
              disabled={busy || !newTitle.trim()}
              className="rounded-lg bg-neutral-900 px-3 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
            >
              Add
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
