"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
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
};

/**
 * Full-page search.
 *
 * On a phone the header's search box had about 140px to live in — the
 * placeholder itself was clipped — and its results opened in a dropdown that
 * covered the page it was floating over. Search is the main way anyone finds a
 * game to log, so on mobile it gets a whole screen: a real input, results as
 * rows big enough to hit, and the back button to leave. The header keeps the
 * inline version from `md` up, where there is room for it.
 */
export function SearchView({ idle }: { idle?: React.ReactNode }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GameResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus on arrival — arriving at a search screen means you intend to type.
  useEffect(() => {
    inputRef.current?.focus();
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
  const visible = useMemo(() => (trimmed ? results : []), [trimmed, results]);
  const isEmptyResult =
    !loading && trimmed !== "" && searched === trimmed && visible.length === 0;
  const loadingLine = useMemo(() => getSearchLoadingMessage(hashSeed(trimmed)), [trimmed]);

  return (
    <div className="mx-auto w-full max-w-2xl px-5 pb-10 pt-6">
      <div className="relative">
        <svg
          viewBox="0 0 24 24"
          width="18"
          height="18"
          aria-hidden="true"
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        >
          <circle cx="11" cy="11" r="6.5" />
          <path d="m16 16 4 4" />
        </svg>
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search games…"
          autoComplete="off"
          // 16px minimum: anything smaller and iOS zooms the whole page in on
          // focus, which you then have to pinch back out of.
          className="w-full rounded-full border border-neutral-800 bg-surface-1 py-3.5 pl-11 pr-4 text-base text-neutral-100 outline-none transition-colors placeholder:text-neutral-600 focus:border-accent"
        />
      </div>

      <div className="mt-6">
        {loading && visible.length === 0 && (
          <p className="px-1 text-sm text-neutral-500">{loadingLine}</p>
        )}

        {isEmptyResult && (
          <p className="px-1 text-sm text-neutral-500">{getSearchEmptyMessage(trimmed)}</p>
        )}

        {!trimmed && (
          <>
            <p className="px-1 font-mono text-[11px] uppercase tracking-[0.15em] text-neutral-600">
              Find a game to log
            </p>
            {/* An empty search screen used to be just that. Now it opens on
                what's coming out, which is also how phones reach the calendar. */}
            {idle && <div className="mt-6">{idle}</div>}
          </>
        )}

        <ul className="divide-y divide-neutral-800/60">
          {visible.map((g) => (
            <li key={g.id}>
              <Link
                href={`/g/${g.slug}`}
                className="flex items-center gap-4 py-3 transition-colors active:bg-surface-1"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={g.coverUrl ?? ""}
                  alt=""
                  loading="lazy"
                  className="h-[68px] w-[51px] shrink-0 rounded-[3px] bg-surface-2 object-cover"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-medium leading-snug text-neutral-100">
                    {g.name}
                  </span>
                  {g.releaseYear && (
                    <span className="mt-0.5 block font-mono text-[11px] text-neutral-500">
                      {g.releaseYear}
                    </span>
                  )}
                </span>
                <span aria-hidden="true" className="shrink-0 text-neutral-700">
                  ›
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
