"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const field =
  "w-full rounded-sm border border-neutral-800 bg-surface-1 px-3.5 py-3 pr-16 text-base text-neutral-100 outline-none transition-colors placeholder:text-neutral-600 focus:border-accent";

/** Set a new password. Rendered only for someone who arrived through a reset link. */
export function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await createClient().auth.updateUser({ password });
    if (error) {
      const code = (error as { code?: string }).code;
      setError(
        code === "same_password"
          ? "That's your current password. Pick a new one."
          : code === "weak_password"
            ? "That password is too easy to guess. Try a longer one."
            : error.message || "Couldn't update your password. Try again.",
      );
      setBusy(false);
      return;
    }
    // Full load, not a client transition — same reason as sign-in: the header
    // lives in the root layout and must re-render against the new session.
    window.location.assign("/");
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          required
          minLength={6}
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="New password"
          aria-label="New password"
          autoComplete="new-password"
          className={field}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-pressed={show}
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute inset-y-0 right-0 flex w-16 items-center justify-center font-mono text-[10px] uppercase tracking-[0.12em] text-neutral-500 transition-colors hover:text-neutral-200"
        >
          {show ? "Hide" : "Show"}
        </button>
      </div>

      {error && (
        <p role="alert" className="text-sm text-status-dropped">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="px-cut w-full bg-accent py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-accent-foreground transition hover:brightness-110 disabled:opacity-50"
      >
        {busy ? "Saving…" : "Set new password"}
      </button>
    </form>
  );
}
