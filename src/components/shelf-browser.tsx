"use client";

import { useMemo, useState } from "react";
import { GamesGrid } from "./games-grid";
import { STATUSES, STATUS_HEX, STATUS_LABEL, type Status } from "@/lib/status";

type LibraryGame = {
  status: string;
  rating: string | null;
  platform: string | null;
  gameId: number;
  gameName: string;
  gameSlug: string;
  coverUrl: string | null;
  releaseYear: number | null;
};

/**
 * The shelf, with its status and platform filters.
 *
 * Filtering used to be server-driven: each tab was a <Link> to `?status=…`,
 * which meant a full navigation for what is really a view toggle. Every tap
 * flashed loading.tsx's skeleton and reset the scroll position to the top of
 * the page, which felt broken.
 *
 * The whole collection is already fetched for the counts, so filtering it here
 * costs nothing and is instant. The URL is still kept in sync — but through
 * history.replaceState rather than the router, so the address stays shareable
 * without triggering a server round trip or a scroll reset.
 */
export function ShelfBrowser({
  games,
  platforms,
  initialStatus,
  initialPlatform,
}: {
  games: LibraryGame[];
  platforms: string[];
  initialStatus: Status | "all";
  initialPlatform: string;
}) {
  const [status, setStatus] = useState<Status | "all">(initialStatus);
  const [platform, setPlatform] = useState(initialPlatform);

  /** Mirror the current view into the URL without navigating. */
  function syncUrl(nextStatus: Status | "all", nextPlatform: string) {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams();
    if (nextStatus !== "all") params.set("status", nextStatus);
    if (nextPlatform) params.set("platform", nextPlatform);
    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }

  const byPlatform = useMemo(
    () => (platform ? games.filter((g) => g.platform === platform) : games),
    [games, platform],
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: byPlatform.length };
    for (const s of STATUSES) c[s] = 0;
    for (const g of byPlatform) c[g.status] = (c[g.status] ?? 0) + 1;
    return c;
  }, [byPlatform]);

  const visible = useMemo(
    () => (status === "all" ? byPlatform : byPlatform.filter((g) => g.status === status)),
    [byPlatform, status],
  );

  const tabs: { key: Status | "all"; label: string }[] = [
    { key: "all", label: "All" },
    ...STATUSES.map((s) => ({ key: s, label: STATUS_LABEL[s] })),
  ];

  return (
    <section>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <h2 className="font-display text-2xl font-semibold tracking-tight text-neutral-100">
          Shelf
          <span className="ml-2.5 font-mono text-sm font-normal text-neutral-500">
            {String(visible.length).padStart(2, "0")}
          </span>
        </h2>

        {platforms.length > 0 && (
          <label className="flex items-center gap-2 text-sm text-neutral-500">
            Platform
            <select
              value={platform}
              onChange={(e) => {
                setPlatform(e.target.value);
                syncUrl(status, e.target.value);
              }}
              className="rounded-lg border border-neutral-800 bg-surface-1 px-2 py-1.5 text-sm text-neutral-200 outline-none focus:border-accent [color-scheme:dark]"
            >
              <option value="">All platforms</option>
              {platforms.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="mb-7 flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-neutral-800/70">
        {tabs.map((t) => {
          const isActive = t.key === status;
          const isAll = t.key === "all";
          const hex = isAll ? "#ff7a6b" : STATUS_HEX[t.key as Status];
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => {
                setStatus(t.key);
                syncUrl(t.key, platform);
              }}
              className={`relative flex items-center gap-2 pb-2.5 font-mono text-[11px] uppercase tracking-[0.15em] transition-colors ${
                isActive ? "text-neutral-100" : "text-neutral-500 hover:text-neutral-300"
              }`}
            >
              {!isAll && (
                <span
                  className="h-[6px] w-[6px] transition-opacity"
                  style={{ background: hex, opacity: isActive ? 1 : 0.45 }}
                  aria-hidden
                />
              )}
              {t.label}
              <span className="tabular-nums text-neutral-400">{counts[t.key] ?? 0}</span>
              <span
                className="absolute inset-x-0 -bottom-px h-0.5 transition-opacity"
                style={{ background: hex, opacity: isActive ? 1 : 0 }}
                aria-hidden
              />
            </button>
          );
        })}
      </div>

      <GamesGrid games={visible} status={status} />
    </section>
  );
}
