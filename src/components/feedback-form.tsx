"use client";

import { useState } from "react";

const field =
  "w-full rounded-sm border border-neutral-800 bg-surface-1 px-3.5 py-3 text-base text-neutral-100 outline-none transition-colors placeholder:text-neutral-600 focus:border-accent";

const MESSAGE_MAX = 2000;

export function FeedbackForm() {
  const [message, setMessage] = useState("");
  const [contact, setContact] = useState("");
  // A real person never sees or fills this; see the route.
  const [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, contact, website }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "Something went wrong. Try again in a moment.");
        return;
      }
      setSent(true);
      setMessage("");
      setContact("");
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div role="status" className="rounded-sm border border-neutral-800 bg-surface-1 px-5 py-6">
        <p className="text-base text-neutral-100">Got it, thanks.</p>
        <button
          type="button"
          onClick={() => setSent(false)}
          className="mt-3 text-[13px] text-neutral-400 underline underline-offset-4 transition-colors hover:text-neutral-100"
        >
          Send another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label htmlFor="feedback-message" className="mb-1.5 block text-[13px] text-neutral-400">
          What&apos;s on your mind?
        </label>
        <textarea
          id="feedback-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={MESSAGE_MAX}
          rows={6}
          required
          className={`${field} resize-y`}
        />
      </div>

      <div>
        <label htmlFor="feedback-contact" className="mb-1.5 block text-[13px] text-neutral-400">
          Email, only if you want a reply
        </label>
        <input
          id="feedback-contact"
          type="email"
          autoComplete="email"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          maxLength={200}
          className={field}
        />
      </div>

      {/* Off-screen rather than display:none, which some bots skip. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Leave this empty
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </label>
      </div>

      {error && (
        <p role="alert" className="text-sm text-status-dropped">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy || !message.trim()}
        className="px-cut w-full bg-accent py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-accent-foreground transition hover:brightness-110 disabled:opacity-50 sm:w-auto sm:px-10"
      >
        {busy ? "Sending…" : "Send"}
      </button>
    </form>
  );
}
