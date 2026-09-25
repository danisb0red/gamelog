"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { StarRating } from "./star-rating";
import { LogSheet } from "./log-modal";
import { STATUS_HEX, STATUS_LABEL, isStatus, type Status } from "@/lib/status";

export type QuickLogGame = {
  id: number;
  name: string;
  slug: string;
  coverUrl: string | null;
  releaseYear: number | null;
};

/** The viewer's latest entry for a game, as `/api/games/search` returns it. */
export type QuickLogMine = { id: string; status: string; rating: number | null } | null;

// The order people reach for them in, not the canonical order in status.ts.
const CHIP_ORDER: Status[] = ["playing", "finished", "backlog", "dropped", "replaying"];

/**
 * `fresh` marks an entry made in this session. Those are amended in place
 * (a mis-tap, a rating added a second later); an entry from an earlier day is
 * history, so changing its status adds a new dated entry instead.
 */
type Entry = { id: string; status: Status; rating: number | null; fresh: boolean };

function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function toEntry(mine: QuickLogMine | undefined): Entry | null {
  if (!mine || !isStatus(mine.status)) return null;
  return { id: mine.id, status: mine.status, rating: mine.rating, fresh: false };
}

function Pip({ status }: { status: Status }) {
  return (
    <span
      aria-hidden="true"
      className="size-2 shrink-0 rounded-full"
      style={{ backgroundColor: STATUS_HEX[status] }}
    />
  );
}

/**
 * One search result that can be logged without leaving the list: `+`, then a
 * status. Rating and the full form stay optional and in place.
 *
 * `mine` is `undefined` for a signed-out viewer (the control becomes a link to
 * sign in) and `null` for a signed-in viewer who hasn't logged this game.
 * Pass `onNavigate` to make the title area a button instead of a link — the
 * header dropdown needs to close itself before it navigates.
 */
export function QuickLog({
  game,
  mine,
  wishlisted = false,
  onNavigate,
  compact = false,
}: {
  game: QuickLogGame;
  mine: QuickLogMine | undefined;
  /** Already on the viewer's wishlist. Independent of `mine`: a game can be both. */
  wishlisted?: boolean;
  onNavigate?: () => void;
  compact?: boolean;
}) {
  const signedIn = mine !== undefined;
  const [entry, setEntry] = useState<Entry | null>(() => toEntry(mine));
  const [wished, setWished] = useState(wishlisted);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [announce, setAnnounce] = useState("");
  const [sheet, setSheet] = useState(false);
  const controlRef = useRef<HTMLButtonElement>(null);

  const state = error ? "error" : pending ? "saving" : entry || wished ? "saved" : "idle";

  function refocusControl() {
    // The chips unmount when they close; without this focus falls to <body>.
    requestAnimationFrame(() => controlRef.current?.focus());
  }

  async function send(url: string, method: "POST" | "PATCH", body: unknown) {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(res.status === 401 ? "signed-out" : `status ${res.status}`);
    const { log } = (await res.json()) as { log: { id: string } };
    return log;
  }

  const failure = (e: unknown) =>
    e instanceof Error && e.message === "signed-out"
      ? "You're signed out. Sign in again to log games."
      : "Couldn't save that. Try again.";

  async function choose(status: Status) {
    if (pending) return;
    setError(null);
    setOpen(false);
    refocusControl();
    if (entry?.status === status) return;

    const prev = entry;
    const amend = prev?.fresh && prev.id ? prev : null;
    setPending(true);
    setEntry({ id: amend?.id ?? "", status, rating: prev?.rating ?? null, fresh: true });
    setAnnounce("");
    try {
      const log = amend
        ? await send(`/api/logs/${amend.id}`, "PATCH", { status })
        : await send("/api/logs", "POST", {
            game,
            status,
            // Same as the full form's "Edit your log": a new entry starts from
            // the rating you already gave, so re-statusing doesn't drop it.
            rating: prev?.rating ?? null,
            review: null,
            platform: null,
            loggedAt: localToday(),
          });
      setEntry({ id: log.id, status, rating: prev?.rating ?? null, fresh: true });
      setAnnounce(`${game.name} set to ${STATUS_LABEL[status]}`);
    } catch (e) {
      setEntry(prev);
      setError(failure(e));
      setOpen(true);
    } finally {
      setPending(false);
    }
  }

  /**
   * The wishlist is not a status: it's the games you want, kept apart from the
   * shelf and its counts. So this never touches the diary — it toggles the
   * separate wishlist, exactly as the game page's button does.
   */
  async function toggleWishlist() {
    if (pending) return;
    setError(null);
    setOpen(false);
    refocusControl();

    const next = !wished;
    setWished(next);
    setPending(true);
    try {
      const res = next
        ? await fetch("/api/wishlist", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ game }),
          })
        : await fetch(`/api/wishlist?gameId=${game.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(res.status === 401 ? "signed-out" : `status ${res.status}`);
      setAnnounce(
        next ? `${game.name} added to your wishlist` : `${game.name} removed from your wishlist`,
      );
    } catch (e) {
      setWished(!next);
      setError(failure(e));
      setOpen(true);
    } finally {
      setPending(false);
    }
  }

  async function rate(value: number) {
    if (pending || !entry?.id) return;
    const prev = entry;
    setError(null);
    setPending(true);
    setEntry({ ...entry, rating: value });
    try {
      await send(`/api/logs/${entry.id}`, "PATCH", { rating: value });
      setAnnounce(`Rated ${game.name} ${value} stars`);
    } catch (e) {
      setEntry(prev);
      setError(failure(e));
    } finally {
      setPending(false);
    }
  }

  const coverClass = compact ? "h-12 w-9" : "h-[68px] w-[51px]";
  const main = (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={game.coverUrl ?? ""}
        alt=""
        loading="lazy"
        className={`${coverClass} shrink-0 rounded-[3px] bg-surface-2 object-cover`}
      />
      <span className="min-w-0 flex-1">
        <span
          className={`block font-medium text-neutral-100 ${compact ? "truncate text-sm" : "text-[15px] leading-snug"}`}
        >
          {game.name}
        </span>
        {game.releaseYear && (
          <span className="mt-0.5 block font-mono text-[11px] text-neutral-500">
            {game.releaseYear}
          </span>
        )}
      </span>
    </>
  );
  const mainClass = `flex min-w-0 flex-1 items-center text-left transition-colors ${
    compact ? "gap-3 rounded-lg p-2 hover:bg-surface-3" : "gap-4 py-3 active:bg-surface-1"
  }`;

  const controlBase =
    "flex min-h-11 shrink-0 items-center justify-center rounded-full border border-neutral-800 text-neutral-300 transition-colors hover:border-neutral-600 hover:text-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

  let control: React.ReactNode;
  if (!signedIn) {
    control = (
      <Link
        href="/login"
        aria-label={`Log ${game.name}`}
        className={`${controlBase} w-11`}
      >
        <PlusIcon />
      </Link>
    );
  } else if (entry) {
    control = (
      <button
        ref={controlRef}
        type="button"
        aria-expanded={open}
        aria-label={`${game.name}: ${STATUS_LABEL[entry.status]}${wished ? ", on your wishlist" : ""}. Change status`}
        onClick={() => setOpen((o) => !o)}
        className={`${controlBase} gap-2 px-3.5 text-[13px]`}
      >
        <Pip status={entry.status} />
        {STATUS_LABEL[entry.status]}
        {wished && <BookmarkIcon filled className="text-accent" />}
      </button>
    );
  } else if (wished) {
    control = (
      <button
        ref={controlRef}
        type="button"
        aria-expanded={open}
        aria-label={`${game.name}: on your wishlist. Change`}
        onClick={() => setOpen((o) => !o)}
        className={`${controlBase} gap-2 border-accent/40 px-3.5 text-[13px] text-accent`}
      >
        <BookmarkIcon filled />
        Wishlist
      </button>
    );
  } else {
    control = (
      <button
        ref={controlRef}
        type="button"
        aria-expanded={open}
        aria-label={`Log ${game.name}`}
        onClick={() => setOpen((o) => !o)}
        className={`${controlBase} w-11`}
      >
        <PlusIcon />
      </button>
    );
  }

  // Lines up under the title, past the cover.
  const indent = compact ? "pl-[60px]" : "pl-[67px]";

  return (
    <div data-quicklog={state} data-game-id={game.id}>
      <div className="flex items-center gap-2">
        {onNavigate ? (
          <button type="button" onClick={onNavigate} className={mainClass}>
            {main}
          </button>
        ) : (
          <Link href={`/g/${game.slug}`} className={mainClass}>
            {main}
          </Link>
        )}
        {control}
      </div>

      {open && signedIn && (
        <div
          role="group"
          aria-label={`Set status for ${game.name}`}
          className={`flex flex-wrap gap-2 pb-3 ${compact ? "px-2" : ""}`}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.stopPropagation();
              setOpen(false);
              refocusControl();
            }
          }}
        >
          {CHIP_ORDER.map((s) => (
            <button
              key={s}
              type="button"
              autoFocus={s === (entry?.status ?? "finished")}
              disabled={pending}
              aria-label={`Set ${game.name} to ${STATUS_LABEL[s]}`}
              aria-pressed={entry?.status === s}
              onClick={() => choose(s)}
              className={`flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm text-neutral-100 disabled:opacity-50 motion-safe:transition-colors ${
                entry?.status === s
                  ? "bg-surface-3"
                  : "border-neutral-800 bg-surface-2 hover:bg-surface-3"
              }`}
              style={entry?.status === s ? { borderColor: STATUS_HEX[s] } : undefined}
            >
              <Pip status={s} />
              {STATUS_LABEL[s]}
            </button>
          ))}
          {/* Dashed, and last: it sits with the statuses because that's where
              you decide about a game, but it isn't one of them. */}
          <button
            type="button"
            disabled={pending}
            aria-label={wished ? `Remove ${game.name} from wishlist` : `Add ${game.name} to wishlist`}
            aria-pressed={wished}
            onClick={toggleWishlist}
            className={`flex min-h-11 items-center gap-2 rounded-full border border-dashed px-4 text-sm disabled:opacity-50 motion-safe:transition-colors ${
              wished
                ? "border-accent bg-accent/10 text-accent"
                : "border-neutral-700 text-neutral-300 hover:bg-surface-3"
            }`}
          >
            <BookmarkIcon filled={wished} />
            Wishlist
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className={`pb-3 text-[13px] text-status-dropped ${compact ? "px-2" : ""}`}>
          {error}
        </p>
      )}

      {entry && !open && (
        <div className={`flex flex-wrap items-center gap-x-4 pb-2 ${indent}`}>
          {/* The stars are 22px tall; the padding brings the touch area to 44. */}
          <div className={`py-[11px] ${pending || !entry.id ? "pointer-events-none opacity-60" : ""}`}>
            <StarRating value={entry.rating} onChange={rate} />
          </div>
          <button
            type="button"
            disabled={!entry.id}
            onClick={() => setSheet(true)}
            className="min-h-11 text-[13px] text-neutral-500 underline-offset-4 hover:text-neutral-200 hover:underline disabled:opacity-50"
            aria-label={`Add details for ${game.name}`}
          >
            Add details
          </button>
        </div>
      )}

      {entry && (
        <LogSheet
          open={sheet}
          onClose={() => {
            setSheet(false);
            refocusControl();
          }}
          game={game}
          existing={{
            status: entry.status,
            rating: entry.rating != null ? String(entry.rating) : null,
            platform: null,
          }}
          amendId={entry.fresh ? entry.id : undefined}
          onSaved={(log) =>
            setEntry({
              id: log.id,
              status: isStatus(log.status) ? log.status : entry.status,
              rating: log.rating,
              fresh: true,
            })
          }
        />
      )}

      <span role="status" className="sr-only">
        {announce}
      </span>
    </div>
  );
}

function BookmarkIcon({ filled = false, className = "" }: { filled?: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      aria-hidden="true"
      className={className}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    >
      <path d="M6.5 3.5h11a1 1 0 0 1 1 1V21l-6.5-4.5L5.5 21V4.5a1 1 0 0 1 1-1z" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
