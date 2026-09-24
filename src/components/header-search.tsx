"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { QuickLog, type QuickLogMine } from "./quick-log";
import {
  getSearchEmptyMessage,
  getSearchLoadingMessage,
  hashSeed,
} from "@/lib/personality";

type GameResult = {
  id: number;
  name: string;
  slug: string;
  coverUrl: string | null;
  releaseYear: number | null;
  mine?: QuickLogMine;
};

/** Global search in the header. Click a result → go to that game's page. */
export function HeaderSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GameResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  /** The query the current `results` belong to — lets us tell "no results yet"
   *  apart from "searched, genuinely nothing". */
  const [searched, setSearched] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);

  // Close the dropdown on outside click.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as Element;
      // The "Add details" sheet is portalled to <body>, outside the box, but
      // clicking in it isn't clicking away — closing would unmount it mid-edit.
      if (target.closest?.('[role="dialog"]')) return;
      if (boxRef.current && !boxRef.current.contains(target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

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
          setOpen(true);
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

  const trimmed = query.trim();
  // Derived rather than cleared in an effect — avoids a redundant render pass
  // and keeps stale results from flashing under a newly-emptied box. Memoised
  // so the empty case returns a stable array rather than a fresh [] each render.
  const visible = useMemo(() => (trimmed ? results : []), [trimmed, results]);
  const isEmptyResult = !loading && trimmed !== "" && searched === trimmed && visible.length === 0;

  // Rotate the loading line per query rather than per keystroke, so it doesn't
  // strobe while the debounce settles.
  const loadingLine = useMemo(
    () => getSearchLoadingMessage(hashSeed(trimmed)),
    [trimmed],
  );

  function goTo(slug: string) {
    setOpen(false);
    setQuery("");
    setResults([]);
    setSearched("");
    router.push(`/g/${slug}`);
  }

  const showPanel = open && (visible.length > 0 || loading || isEmptyResult);

  return (
    <div ref={boxRef} className="relative w-full max-w-md">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => (results.length > 0 || isEmptyResult) && setOpen(true)}
        placeholder="Search games…"
        className="w-full rounded-full border border-neutral-800 bg-surface-1 px-4 py-2 text-sm outline-none focus:border-accent"
      />

      {showPanel && (
        <ul className="absolute z-50 mt-2 max-h-96 w-full overflow-y-auto rounded-sm border border-neutral-800 bg-surface-2 p-1 shadow-2xl">
          {loading && visible.length === 0 && (
            <li className="px-3 py-2 text-sm text-neutral-500">{loadingLine}</li>
          )}

          {isEmptyResult && (
            <li className="px-3 py-3 text-sm text-neutral-500">
              {getSearchEmptyMessage(trimmed)}
            </li>
          )}

          {visible.map((g) => (
            <li key={g.id}>
              <QuickLog game={g} mine={g.mine} compact onNavigate={() => goTo(g.slug)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
