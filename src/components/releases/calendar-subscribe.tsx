"use client";

import { useState } from "react";
import { SheetGrip, SheetOverlay } from "@/components/sheet";

type State =
  | { kind: "loading" }
  | { kind: "none" }
  // A link exists but its plaintext is gone: only a hash is stored.
  | { kind: "hidden" }
  | { kind: "ready"; url: string }
  | { kind: "error"; message: string };

const button =
  "flex min-h-11 w-full items-center justify-center rounded-lg px-4 text-sm font-medium transition disabled:opacity-50";
const primary = `${button} bg-accent text-accent-foreground hover:bg-accent/90`;
const secondary = `${button} border border-neutral-700 text-neutral-100 hover:border-neutral-500`;

export function CalendarSubscribe() {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<State>({ kind: "loading" });
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function show() {
    setOpen(true);
    setCopied(false);
    // Keep a link created earlier in this session: it can't be fetched again.
    if (state.kind === "ready") return;
    setState({ kind: "loading" });
    try {
      const res = await fetch("/api/calendar/token", { cache: "no-store" });
      if (!res.ok) throw new Error();
      const { exists } = await res.json();
      setState({ kind: exists ? "hidden" : "none" });
    } catch {
      setState({ kind: "error", message: "Could not load your calendar link." });
    }
  }

  async function create() {
    setBusy(true);
    setCopied(false);
    try {
      const res = await fetch("/api/calendar/token", { method: "POST" });
      if (!res.ok) throw new Error();
      const { url } = await res.json();
      setState({ kind: "ready", url });
    } catch {
      setState({ kind: "error", message: "Could not create the link. Try again." });
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      const res = await fetch("/api/calendar/token", { method: "DELETE" });
      if (!res.ok) throw new Error();
      setState({ kind: "none" });
    } catch {
      setState({ kind: "error", message: "Could not remove the link. Try again." });
    } finally {
      setBusy(false);
    }
  }

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setState({ kind: "error", message: "Could not copy. Select the link and copy it by hand." });
    }
  }

  const webcal = state.kind === "ready" ? state.url.replace(/^https?:\/\//, "webcal://") : "";

  return (
    <>
      <button
        type="button"
        onClick={show}
        className="-ml-2 inline-flex min-h-11 items-center gap-2 px-2 font-mono text-[11px] uppercase tracking-[0.15em] text-neutral-400 transition hover:text-neutral-50"
      >
        <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
          <path d="M8 3v4M16 3v4M3.5 10h17" />
        </svg>
        Add to your calendar
      </button>

      <SheetOverlay open={open} onClose={() => !busy && setOpen(false)} className="sm:pt-[12vh]">
        <div
          className="sheet w-full max-w-md space-y-4 overflow-y-auto rounded-t-2xl bg-surface-2 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl ring-1 ring-neutral-800 sm:rounded-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <SheetGrip />
          <h2 className="font-semibold">Add to your calendar</h2>
          <p className="text-sm text-neutral-400">
            Release dates for games on your wishlist and shelf, in your own calendar app. If a date moves, the event moves with it.
          </p>

          {state.kind === "loading" && <p className="text-sm text-neutral-500">Loading…</p>}

          {(state.kind === "none" || state.kind === "hidden") && (
            <>
              {state.kind === "hidden" && (
                <p className="text-sm text-neutral-400">
                  You already have a link, but it can only be shown when it is created. Make a new one to add it to another calendar; the current one will stop working.
                </p>
              )}
              <button type="button" onClick={create} disabled={busy} className={primary}>
                {busy ? "Creating…" : state.kind === "hidden" ? "Make a new link" : "Create link"}
              </button>
              {state.kind === "hidden" && (
                <button type="button" onClick={remove} disabled={busy} className="min-h-11 w-full text-sm text-neutral-500 transition hover:text-neutral-100">
                  Remove link
                </button>
              )}
            </>
          )}

          {state.kind === "ready" && (
            <>
              <a href={webcal} className={primary}>
                Apple Calendar
              </a>
              <a
                href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`}
                target="_blank"
                rel="noopener noreferrer"
                className={secondary}
              >
                Google Calendar
              </a>
              <button type="button" onClick={() => copy(state.url)} className={secondary}>
                {copied ? "Copied" : "Copy link"}
              </button>
              <p className="text-xs leading-relaxed text-neutral-500">
                Your calendar app decides how often to refresh, so changes can take up to a day. Anyone with this link can see these dates, so keep it to yourself.
              </p>
              <button type="button" onClick={create} disabled={busy} className="min-h-11 w-full text-sm text-neutral-400 transition hover:text-neutral-100 disabled:opacity-50">
                Regenerate link (the old one stops working)
              </button>
            </>
          )}

          {state.kind === "error" && (
            <>
              <p className="text-sm text-red-500">{state.message}</p>
              <button type="button" onClick={show} className={secondary}>
                Try again
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setOpen(false)}
            className="min-h-11 w-full text-sm text-neutral-500 transition hover:text-neutral-100"
          >
            Close
          </button>
        </div>
      </SheetOverlay>
    </>
  );
}
