"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** "+ New list" button that opens a modal to create a list, then navigates to it. */
export function CreateListModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isRanked, setIsRanked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    if (!title.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, isRanked }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create list");
      router.push(`/list/${data.list.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition hover:bg-accent/90"
      >
        + New list
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-[12vh]"
          onClick={() => !busy && setOpen(false)}
        >
          <div
            className="w-full max-w-md space-y-4 rounded-2xl bg-surface-2 p-5 shadow-2xl ring-1 ring-neutral-800"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-semibold">New list</h2>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="List title (e.g. Favorite RPGs)"
              className="w-full rounded-lg border border-neutral-800 bg-surface-1 px-3 py-2.5 text-base outline-none focus:border-accent"
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description (optional)"
              rows={2}
              className="w-full resize-none rounded-lg border border-neutral-800 bg-surface-1 px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <label className="flex items-center gap-2 text-sm text-neutral-300">
              <input
                type="checkbox"
                checked={isRanked}
                onChange={(e) => setIsRanked(e.target.checked)}
              />
              Ranked list (numbered order)
            </label>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={busy}
                className="rounded-lg px-3 py-2 text-sm text-neutral-500 hover:text-neutral-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={create}
                disabled={busy || !title.trim()}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition hover:bg-accent/90 disabled:opacity-50"
              >
                {busy ? "Creating…" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
