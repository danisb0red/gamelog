"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SheetOverlay, SheetGrip } from "./sheet";
import { getSearchEmptyMessage, getSearchLoadingMessage, hashSeed } from "@/lib/personality";

type GameResult = {
  id: number;
  name: string;
  slug: string;
  coverUrl: string | null;
  releaseYear: number | null;
};

/**
 * Add games to a list from the list itself.
 *
 * Building a list used to mean leaving it: open a game's page, use "Add to
 * list", pick the list, go back, repeat. Ten games meant twenty navigations.
 *
 * So this searches in place and **stays open** after each add — that is the
 * whole point, and why it tracks what it has added rather than closing on
 * success. Games already on the list come in as `existingIds` and read as done
 * from the first frame, so you can't quietly add a duplicate (the API no-ops on
 * one anyway, which would otherwise look like a dead button).
 */
export function AddGamesToList({
  listId,
  existingIds,
}: {
  listId: string;
  existingIds: number[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GameResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState("");
  const [added, setAdded] = useState<Set<number>>(new Set());
  const [pending, setPending] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    const q = query.trim();
    if (!q) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/games/search?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        const data = await res.json();
        if (res.ok) {
          setResults(data.results);
          setSearched(q);
        }
      } catch {
        /* aborted */
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const onList = useMemo(
    () => new Set([...existingIds, ...added]),
    [existingIds, added],
  );

  async function add(game: GameResult) {
    setPending(game.id);
    setError(null);
    try {
      const res = await fetch(`/api/lists/${listId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ game }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Could not add that game");
      }
      setAdded((prev) => new Set(prev).add(game.id));
      // Refresh the list behind the sheet so the count and rows are already
      // right when it closes.
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setPending(null);
    }
  }

  const trimmed = query.trim();
  const visible = useMemo(() => (trimmed ? results : []), [trimmed, results]);
  const isEmptyResult =
    !loading && trimmed !== "" && searched === trimmed && visible.length === 0;
  const loadingLine = useMemo(() => getSearchLoadingMessage(hashSeed(trimmed)), [trimmed]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-cut shrink-0 bg-accent px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.15em] text-accent-foreground transition hover:brightness-110"
      >
        + Add games
      </button>

      <SheetOverlay open={open} onClose={() => setOpen(false)} className="sm:pt-[10vh]">
        <div
          className="sheet flex w-full max-w-md flex-col overflow-hidden rounded-t-2xl bg-surface-2 p-5 shadow-2xl ring-1 ring-neutral-800 sm:rounded-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <SheetGrip />

          <div className="mb-4 flex items-baseline justify-between gap-3">
            <h2 className="font-display text-lg font-semibold text-neutral-100">
              Add games
            </h2>
            {added.size > 0 && (
              <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-neutral-500">
                {added.size} added
              </span>
            )}
          </div>

          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search games…"
            autoComplete="off"
            // 16px minimum or iOS zooms the page in on focus.
            className="w-full shrink-0 rounded-full border border-neutral-800 bg-surface-1 px-4 py-3 text-base text-neutral-100 outline-none transition-colors placeholder:text-neutral-600 focus:border-accent"
          />

          {error && <p className="mt-3 shrink-0 text-sm text-status-dropped">{error}</p>}

          <div className="-mx-1 mt-2 min-h-0 flex-1 overflow-y-auto px-1">
            {loading && visible.length === 0 && (
              <p className="px-1 py-3 text-sm text-neutral-500">{loadingLine}</p>
            )}

            {isEmptyResult && (
              <p className="px-1 py-3 text-sm text-neutral-500">
                {getSearchEmptyMessage(trimmed)}
              </p>
            )}

            {!trimmed && (
              <p className="px-1 py-3 font-mono text-[11px] uppercase tracking-[0.15em] text-neutral-600">
                Search to add — the sheet stays open
              </p>
            )}

            <ul className="divide-y divide-neutral-800/60">
              {visible.map((g) => {
                const done = onList.has(g.id);
                return (
                  <li key={g.id} className="flex items-center gap-3 py-2.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={g.coverUrl ?? ""}
                      alt=""
                      loading="lazy"
                      className="h-14 w-[42px] shrink-0 rounded-[3px] bg-surface-1 object-cover"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium leading-snug text-neutral-100">
                        {g.name}
                      </span>
                      {g.releaseYear && (
                        <span className="mt-0.5 block font-mono text-[11px] text-neutral-500">
                          {g.releaseYear}
                        </span>
                      )}
                    </span>
                    <button
                      type="button"
                      disabled={done || pending === g.id}
                      onClick={() => add(g)}
                      className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                        done
                          ? "border-transparent text-neutral-500"
                          : "border-neutral-700 text-neutral-200 hover:border-accent hover:text-accent disabled:opacity-50"
                      }`}
                    >
                      {done ? "✓ On list" : pending === g.id ? "…" : "Add"}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-4 shrink-0 rounded-lg py-2.5 text-sm text-neutral-400 transition-colors hover:text-neutral-100"
          >
            Done
          </button>
        </div>
      </SheetOverlay>
    </>
  );
}
