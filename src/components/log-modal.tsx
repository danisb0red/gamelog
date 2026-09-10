"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StarRating } from "./star-rating";
import { PixelSave } from "./pixel";
import { SheetOverlay, SheetGrip } from "./sheet";

type GameInput = {
  id: number;
  name: string;
  slug: string;
  coverUrl: string | null;
  releaseYear: number | null;
};

const STATUSES = [
  { value: "playing", label: "Playing" },
  { value: "finished", label: "Finished" },
  { value: "backlog", label: "Backlog" },
  { value: "dropped", label: "Dropped" },
  { value: "replaying", label: "Replaying" },
] as const;

type Status = (typeof STATUSES)[number]["value"];

/**
 * Log / rate / review a specific game. Opened from the game page, so the game
 * is always known up front — no search step.
 */
export function LogModal({
  game,
  platforms = [],
  existing,
}: {
  game: GameInput;
  platforms?: string[];
  existing?: { status: string; rating: string | null; platform: string | null } | null;
}) {
  const [open, setOpen] = useState(false);


  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground transition hover:bg-accent/90"
      >
        {existing ? "Edit your log" : "Log, rate, review"}
      </button>

      <SheetOverlay open={open} onClose={() => setOpen(false)} className="sm:pt-[10vh]">
        <div
          className="sheet px-cut-lg w-full max-w-md overflow-y-auto bg-surface-2 p-5 shadow-2xl ring-1 ring-neutral-800"
          onClick={(e) => e.stopPropagation()}
        >
          <SheetGrip />
          <LogForm
            game={game}
            platforms={platforms}
            existing={existing}
            onDone={() => setOpen(false)}
          />
        </div>
      </SheetOverlay>
    </>
  );
}

function LogForm({
  game,
  platforms,
  existing,
  onDone,
}: {
  game: GameInput;
  platforms: string[];
  existing?: { status: string; rating: string | null; platform: string | null } | null;
  onDone: () => void;
}) {
  const router = useRouter();
  const today = new Date();
  const localToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const [status, setStatus] = useState<Status>(
    (existing?.status as Status) ?? "finished",
  );
  const [rating, setRating] = useState<number | null>(
    existing?.rating != null ? Number(existing.rating) : null,
  );
  const [review, setReview] = useState("");
  const [platform, setPlatform] = useState<string>(existing?.platform ?? "");
  const [loggedAt, setLoggedAt] = useState(localToday);
  const [saving, setSaving] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  async function save() {
    setSaving(true);
    const payload = {
      game: {
        id: game.id,
        name: game.name,
        slug: game.slug,
        coverUrl: game.coverUrl,
        releaseYear: game.releaseYear,
      },
      status,
      rating,
      review: review || null,
      platform: platform || null,
      loggedAt,
    };

    setConfirmed(true);

    const request = fetch("/api/logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(async (res) => {
        if (!res.ok) console.error("Log save failed", await res.text());
        else router.refresh();
      })
      .catch((err) => console.error("Log save error", err));

    // Hold briefly so the confirmation is legible even on a fast network. The
    // request runs underneath, never after.
    await Promise.all([request, new Promise((r) => setTimeout(r, 550))]);
    setSaving(false);
    onDone();
  }

  if (confirmed) {
    /**
     * Save confirmation.
     *
     * Previously this was a whole save-screen sequence — SAVE DATA, SAVING…,
     * a progress bar, "do not power off", and an outcome that shouted QUEST
     * COMPLETE. It was the interface cosplaying as a console, which is the
     * opposite of the point. One word and a small mark does the same job and
     * trusts the reader.
     */
    return (
      <div className="save-pop flex min-h-44 flex-col items-center justify-center gap-3 text-center">
        <PixelSave size={26} className="text-accent" />
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-300">
          Saved
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={game.coverUrl ?? ""}
          alt=""
          className="h-20 w-14 shrink-0 rounded bg-surface-2 object-cover"
        />
        <div>
          <p className="font-semibold">{game.name}</p>
          {game.releaseYear && (
            <p className="text-sm text-neutral-500">{game.releaseYear}</p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => setStatus(s.value)}
            className={`rounded-full px-3 py-1.5 text-sm transition ${
              status === s.value
                ? "bg-accent text-accent-foreground"
                : "bg-surface-3 text-neutral-400 hover:bg-surface-3 hover:text-neutral-200"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {platforms.length > 0 && (
        <div className="flex items-center gap-2 text-sm">
          <label className="text-neutral-500">Platform</label>
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-neutral-800 bg-surface-1 px-2 py-1.5 text-sm outline-none focus:border-accent [color-scheme:dark]"
          >
            <option value="">— not set —</option>
            {platforms.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex items-center gap-2 text-sm">
        <label className="text-neutral-500">Date</label>
        <input
          type="date"
          value={loggedAt}
          max={localToday}
          onChange={(e) => setLoggedAt(e.target.value)}
          className="rounded-lg border border-neutral-800 bg-surface-1 px-2 py-1.5 text-sm outline-none focus:border-accent [color-scheme:dark]"
        />
      </div>

      <div className="flex items-center gap-3">
        <StarRating value={rating} onChange={setRating} />
        {rating != null && (
          <button
            type="button"
            onClick={() => setRating(null)}
            className="text-xs text-neutral-400 hover:text-neutral-600"
          >
            clear
          </button>
        )}
      </div>

      <textarea
        value={review}
        onChange={(e) => setReview(e.target.value)}
        placeholder="Add a review or notes (optional)…"
        rows={3}
        className="w-full resize-none rounded-lg border border-neutral-800 bg-surface-1 px-3 py-2 text-sm outline-none focus:border-accent"
      />

      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="w-full rounded-lg bg-accent py-2.5 text-sm font-medium text-accent-foreground transition hover:bg-accent/90 disabled:opacity-50"
      >
        {saving ? "Saving…" : existing ? "Update log" : "Save log"}
      </button>
    </div>
  );
}
