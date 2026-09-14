"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ReleaseEntry } from "@/lib/games/types";
import {
  BIG_RELEASE_HYPE,
  PLATFORM_FAMILIES,
  type PlatformFamily,
  daysBetween,
  formatDay,
  inFamily,
} from "@/lib/releases";
import { ReleaseRow, type Mine } from "./release-row";
import { RelativeDay, useLocalToday } from "./relative-day";

export type CalendarView = "big" | "all" | "yours";

const dayId = (day: string) => `day-${day}`;

/**
 * The agenda: filters, a day strip that follows your scroll, and on wide
 * screens a mini month you can jump around in.
 *
 * Everything below filters on the client — the month is already loaded, so a
 * filter tap is instant and the URL is kept in step with replaceState, the same
 * way the shelf does it. Only changing month is a real navigation.
 */
export function ReleaseCalendar({
  month,
  entries,
  mine,
  canWishlist,
  failed,
  serverToday,
  initialView,
  initialFamily,
}: {
  month: string;
  entries: ReleaseEntry[];
  mine: Record<number, Mine>;
  canWishlist: boolean;
  failed: boolean;
  /** UTC today, so the server's first render already splits past from upcoming;
   *  the browser corrects it for the viewer's own timezone after hydration. */
  serverToday: string;
  initialView: CalendarView;
  initialFamily: PlatformFamily | null;
}) {
  // Opens on Highlights: "All" is ~280 entries a month, mostly unknown PC
  // releases, which buries the games anyone is waiting for. A month with no
  // highlights at all (far-future months) falls back to All rather than
  // opening on an empty filter.
  const [view, setView] = useState<CalendarView>(() => {
    const v = !canWishlist && initialView === "yours" ? "big" : initialView;
    if (v === "big" && !entries.some((e) => e.hype >= BIG_RELEASE_HYPE || mine[e.game.id])) return "all";
    return v;
  });
  const [family, setFamily] = useState<PlatformFamily | null>(initialFamily);
  const [showEarlier, setShowEarlier] = useState(false);
  const [activeDay, setActiveDay] = useState<string | null>(null);
  const [pendingJump, setPendingJump] = useState<string | null>(null);

  const today = useLocalToday() ?? serverToday;
  const isCurrentMonth = today.slice(0, 7) === month;

  const rootRef = useRef<HTMLDivElement>(null);
  /** The sticky bar — measured for offsets. */
  const stickyRef = useRef<HTMLDivElement>(null);
  /** The pill row inside it — the thing that actually scrolls sideways. These
   *  were one ref at first, and scrollTo on a non-scrolling wrapper does
   *  nothing, so the strip sat on the 1st all month. */
  const stripRef = useRef<HTMLDivElement>(null);
  const lockUntil = useRef(0);
  const followed = useRef(false);

  // ── Filtering ────────────────────────────────────────────────────────────
  const counts = useMemo(() => {
    const byFamily = family ? entries.filter((e) => inFamily(e, family)) : entries;
    return {
      all: byFamily.length,
      big: byFamily.filter((e) => e.hype >= BIG_RELEASE_HYPE || mine[e.game.id]).length,
      yours: byFamily.filter((e) => mine[e.game.id]).length,
    };
  }, [entries, family, mine]);

  const filtered = useMemo(
    () =>
      entries.filter(
        (e) =>
          (!family || inFamily(e, family)) &&
          (view === "all" || (view === "big" ? e.hype >= BIG_RELEASE_HYPE || Boolean(mine[e.game.id]) : Boolean(mine[e.game.id]))),
      ),
    [entries, family, view, mine],
  );

  const days = useMemo(() => {
    const map = new Map<string, ReleaseEntry[]>();
    for (const e of filtered) map.set(e.date, [...(map.get(e.date) ?? []), e]);
    // Within a day: your games first, then by anticipation.
    for (const list of map.values())
      list.sort((a, b) => Number(Boolean(mine[b.game.id])) - Number(Boolean(mine[a.game.id])) || b.hype - a.hype);
    return map;
  }, [filtered, mine]);

  const dayKeys = useMemo(() => [...days.keys()].sort(), [days]);
  // Memoised: the scroll listener below re-subscribes whenever visibleDays
  // changes identity, and a fresh array every render would do that constantly.
  const earlier = useMemo(() => (isCurrentMonth ? dayKeys.filter((d) => d < today) : []), [isCurrentMonth, dayKeys, today]);
  const visibleDays = useMemo(() => (showEarlier ? dayKeys : dayKeys.filter((d) => !earlier.includes(d))), [showEarlier, dayKeys, earlier]);
  const earlierCount = useMemo(() => earlier.reduce((n, d) => n + (days.get(d)?.length ?? 0), 0), [earlier, days]);

  // ── URL ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set("month", month);
    if (view === "big") params.delete("view");
    else params.set("view", view);
    if (family) params.set("platform", family);
    else params.delete("platform");
    window.history.replaceState(null, "", `?${params}`);
  }, [month, view, family]);

  // ── Sticky offsets ─────────────────────────────────────────────────────────
  // Measured, not hardcoded: the header grows by the safe-area inset in an
  // installed PWA, and the strip disappears entirely on wide screens.
  useLayoutEffect(() => {
    const root = rootRef.current;
    const header = document.querySelector("body > header, header.sticky") as HTMLElement | null;
    if (!root) return;
    const apply = () => {
      root.style.setProperty("--app-header", `${header?.offsetHeight ?? 0}px`);
      root.style.setProperty("--cal-strip", `${stickyRef.current?.offsetHeight ?? 0}px`);
    };
    apply();
    const ro = new ResizeObserver(apply);
    if (header) ro.observe(header);
    if (stickyRef.current) ro.observe(stickyRef.current);
    return () => ro.disconnect();
  }, []);

  // ── Scroll-follow ────────────────────────────────────────────────────────
  // The active day is the last section whose top has passed under the sticky
  // stack. Computed on scroll, rAF-throttled: deterministic where an
  // IntersectionObserver flickers between two short adjacent days.
  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (Date.now() < lockUntil.current) return;
        const root = rootRef.current;
        if (!root) return;
        const offset =
          parseFloat(getComputedStyle(root).getPropertyValue("--app-header") || "0") +
          parseFloat(getComputedStyle(root).getPropertyValue("--cal-strip") || "0") + 12;
        let current: string | null = visibleDays[0] ?? null;
        for (const d of visibleDays) {
          const el = document.getElementById(dayId(d));
          if (el && el.getBoundingClientRect().top <= offset) current = d;
          else break;
        }
        setActiveDay(current);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [visibleDays]);

  // Keep the active pill in view by scrolling the strip itself — never
  // scrollIntoView, which would drag the page along with it.
  useEffect(() => {
    const strip = stripRef.current;
    const pill = activeDay ? strip?.querySelector<HTMLElement>(`[data-day="${activeDay}"]`) : null;
    if (!strip || !pill) return;
    // Rect deltas rather than offsetLeft: the pill's offsetParent is the sticky
    // wrapper, not the scroller, so offsetLeft is off by the wrapper's padding.
    const delta = pill.getBoundingClientRect().left - strip.getBoundingClientRect().left;
    strip.scrollTo({
      left: strip.scrollLeft + delta - (strip.clientWidth - pill.offsetWidth) / 2,
      // Land on today instantly on load; only glide once you're scrolling.
      behavior: followed.current ? "smooth" : "auto",
    });
    followed.current = true;
  }, [activeDay]);

  const jumpTo = useCallback((day: string) => {
    const el = document.getElementById(dayId(day));
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    lockUntil.current = Date.now() + (reduced ? 50 : 700);
    setActiveDay(day);
    el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  }, []);

  const requestJump = (day: string) => {
    if (earlier.includes(day) && !showEarlier) {
      setShowEarlier(true);
      setPendingJump(day); // the section doesn't exist until the next render
    } else jumpTo(day);
  };

  useEffect(() => {
    if (!pendingJump) return;
    const day = pendingJump;
    const raf = requestAnimationFrame(() => {
      jumpTo(day);
      setPendingJump(null);
    });
    return () => cancelAnimationFrame(raf);
  }, [pendingJump, jumpTo]);

  // ── Render ───────────────────────────────────────────────────────────────
  const views: { key: CalendarView; label: string; n: number }[] = [
    { key: "big", label: "Highlights", n: counts.big },
    { key: "all", label: "All", n: counts.all },
    ...(canWishlist ? [{ key: "yours" as const, label: "Your games", n: counts.yours }] : []),
  ];

  return (
    <div ref={rootRef} className="relative">
      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 rounded-full border border-neutral-800 bg-surface-1/70 p-1" role="tablist">
          {views.map((v) => (
            <button
              key={v.key}
              type="button"
              role="tab"
              aria-selected={view === v.key}
              onClick={() => setView(v.key)}
              className={`flex-1 whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] transition sm:flex-none ${
                view === v.key ? "bg-neutral-100 font-medium text-neutral-900" : "text-neutral-400 hover:text-neutral-100"
              }`}
            >
              {v.label}
              <span className={`ml-1.5 font-mono text-[10px] ${view === v.key ? "text-neutral-500" : "text-neutral-600"}`}>{v.n}</span>
            </button>
          ))}
        </div>

        <div className="cal-strip cal-chips -mx-5 flex gap-1.5 px-5 sm:mx-0 sm:px-0">
          {PLATFORM_FAMILIES.map((f) => (
            <button
              key={f.key}
              type="button"
              aria-pressed={family === f.key}
              onClick={() => setFamily(family === f.key ? null : f.key)}
              className={`shrink-0 rounded-full border px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.1em] transition ${
                family === f.key
                  ? "border-accent bg-accent/15 text-accent"
                  : "border-neutral-800 text-neutral-400 hover:border-neutral-600 hover:text-neutral-100"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {failed ? (
        <p className="mt-12 text-sm text-neutral-400">
          Couldn&apos;t load releases right now.{" "}
          <a href={`?month=${month}`} className="text-accent underline-offset-4 hover:underline">Try again</a>
        </p>
      ) : dayKeys.length === 0 ? (
        <div className="mt-12">
          <p className="text-sm text-neutral-400">
            {view === "yours"
              ? "None of your games come out this month."
              : entries.length === 0
                ? `No exact release dates for ${formatDay(`${month}-01`, { month: "long" })} yet. Dates firm up closer to launch.`
                : "Nothing matches that filter this month."}
          </p>
          {(view !== "all" || family) && (
            <button type="button" onClick={() => { setView("all"); setFamily(null); }} className="mt-3 font-mono text-[11px] uppercase tracking-[0.15em] text-accent">
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="mt-6 lg:grid lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-14">
          <div className="min-w-0">
            {/* Day strip — phones and tablets; the mini month replaces it on lg. */}
            <div
              ref={stickyRef}
              className="cal-sticky sticky z-20 -mx-5 border-b border-neutral-800/70 px-5 py-2.5 backdrop-blur-xl backdrop-saturate-150 lg:hidden"
              style={{ top: "var(--app-header)" }}
            >
              <div ref={stripRef} className="cal-strip flex gap-1.5">
                {dayKeys.map((d) => {
                  const active = d === activeDay;
                  const isToday = d === today;
                  const hasMine = days.get(d)!.some((e) => mine[e.game.id]);
                  return (
                    <button
                      key={d}
                      type="button"
                      data-day={d}
                      onClick={() => requestJump(d)}
                      aria-current={active ? "true" : undefined}
                      className={`relative flex w-12 shrink-0 flex-col items-center rounded-xl py-1.5 transition ${
                        active ? "bg-neutral-100 text-neutral-900" : d < today && isCurrentMonth ? "text-neutral-600" : "text-neutral-300"
                      } ${isToday && !active ? "ring-1 ring-accent/60" : ""}`}
                    >
                      <span className="font-mono text-[9px] uppercase tracking-[0.12em] opacity-70">
                        {formatDay(d, { weekday: "short" })}
                      </span>
                      <span className="font-display text-lg font-semibold leading-tight tabular-nums">{Number(d.slice(8))}</span>
                      <span className={`mt-0.5 h-1 w-1 rounded-full ${hasMine ? "bg-accent" : active ? "bg-neutral-900/40" : "bg-neutral-600"}`} />
                    </button>
                  );
                })}
              </div>
            </div>

            {earlier.length > 0 && (
              <button
                type="button"
                onClick={() => setShowEarlier((v) => !v)}
                className="mt-5 flex w-full items-center justify-between rounded-lg border border-dashed border-neutral-800 px-4 py-3 text-left transition hover:border-neutral-700"
              >
                <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-neutral-400">
                  {showEarlier ? "Hide earlier this month" : `Earlier this month · ${earlierCount}`}
                </span>
                <span aria-hidden="true" className={`text-neutral-500 transition-transform ${showEarlier ? "rotate-180" : ""}`}>⌄</span>
              </button>
            )}

            {visibleDays.map((d) => {
              const list = days.get(d)!;
              const past = isCurrentMonth && d < today;
              const n = daysBetween(today, d);
              return (
                <section key={d} id={dayId(d)} className={`cal-day ${past ? "opacity-60" : ""}`}>
                  {/* Not sticky. A second sticky layer under the strip took a
                      quarter of a phone screen, and the strip already shows
                      which day you are in. */}
                  <div className="flex items-baseline gap-3 border-b border-neutral-800/60 pb-2.5 pt-7">
                    <span className={`font-display text-[34px] font-bold leading-none tabular-nums ${n === 0 ? "text-accent" : "text-neutral-50"}`}>
                      {Number(d.slice(8))}
                    </span>
                    <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-neutral-400">
                      {formatDay(d, { weekday: "long" })}
                    </span>
                    <span className="ml-auto flex items-baseline gap-3">
                      <RelativeDay day={d} className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-accent" />
                      <span className="font-mono text-[10.5px] text-neutral-600">{list.length}</span>
                    </span>
                  </div>
                  <ul className="divide-y divide-neutral-800/50">
                    {list.map((e, i) => (
                      <ReleaseRow key={`${e.game.id}:${e.date}`} entry={e} mine={mine[e.game.id] ?? null} canWishlist={canWishlist} index={i} />
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>

          {/* Mini month — wide screens only. */}
          <aside className="hidden lg:block">
            <div className="sticky" style={{ top: "calc(var(--app-header) + 24px)" }}>
              <MiniMonth month={month} days={days} mine={mine} today={today} active={activeDay} onPick={requestJump} />
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

function MiniMonth({
  month,
  days,
  mine,
  today,
  active,
  onPick,
}: {
  month: string;
  days: Map<string, ReleaseEntry[]>;
  mine: Record<number, Mine>;
  today: string;
  active: string | null;
  onPick: (day: string) => void;
}) {
  const [y, m] = month.split("-").map(Number);
  const length = new Date(Date.UTC(y, m, 0)).getUTCDate();
  // Monday-first. getUTCDay is Sunday = 0.
  const lead = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;

  return (
    <div className="rounded-2xl border border-neutral-800/80 bg-surface-1/60 p-4">
      <div className="grid grid-cols-7 gap-1 text-center">
        {["M", "T", "W", "T", "F", "S", "S"].map((l, i) => (
          <span key={i} className="pb-1.5 font-mono text-[9.5px] uppercase tracking-[0.1em] text-neutral-600">{l}</span>
        ))}
        {Array.from({ length: lead }).map((_, i) => <span key={`lead-${i}`} />)}
        {Array.from({ length }).map((_, i) => {
          const d = `${month}-${String(i + 1).padStart(2, "0")}`;
          const list = days.get(d);
          const hasMine = list?.some((e) => mine[e.game.id]);
          const isActive = d === active;
          return (
            <button
              key={d}
              type="button"
              disabled={!list}
              onClick={() => onPick(d)}
              className={`relative flex aspect-square flex-col items-center justify-center rounded-lg text-[12.5px] tabular-nums transition ${
                isActive
                  ? "bg-neutral-100 font-semibold text-neutral-900"
                  : list
                    ? `text-neutral-200 hover:bg-surface-3 ${d < today ? "opacity-50" : ""}`
                    : "text-neutral-700"
              } ${d === today && !isActive ? "ring-1 ring-accent/70" : ""}`}
            >
              {i + 1}
              {list && (
                <span className="absolute bottom-1 flex gap-0.5">
                  <span className={`h-1 w-1 rounded-full ${hasMine ? "bg-accent" : isActive ? "bg-neutral-900/40" : "bg-neutral-500"}`} />
                  {list.length >= 5 && <span className={`h-1 w-1 rounded-full ${isActive ? "bg-neutral-900/40" : "bg-neutral-500"}`} />}
                  {list.length >= 12 && <span className={`h-1 w-1 rounded-full ${isActive ? "bg-neutral-900/40" : "bg-neutral-500"}`} />}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="mt-3 space-y-1.5 font-mono text-[9.5px] uppercase tracking-[0.12em] text-neutral-600">
        <p className="flex items-center gap-2">
          <span className="h-1 w-1 rounded-full bg-accent" /> Your games
        </p>
        <p className="flex items-center gap-2">
          <span className="flex gap-0.5">
            <span className="h-1 w-1 rounded-full bg-neutral-500" />
            <span className="h-1 w-1 rounded-full bg-neutral-500" />
            <span className="h-1 w-1 rounded-full bg-neutral-500" />
          </span>
          Busier day
        </p>
      </div>
    </div>
  );
}
