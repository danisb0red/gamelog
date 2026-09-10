"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Mode = "signin" | "signup";

export function LoginForm() {
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    const supabase = createClient();

    try {
      if (mode === "signup") {
        // The name is stored on the auth user, not written straight to the
        // profiles table, because sign-up may not produce a session yet (email
        // confirmation). Keeping it in user_metadata means ensureProfile can
        // pick it up whenever the user actually arrives.
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: name.trim() } },
        });
        if (error) throw error;
        // If email confirmation is on, there's no session yet.
        if (!data.session) {
          setMessage("Check your email to confirm your account, then sign in.");
          setMode("signin");
          setBusy(false);
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      /*
        Leave the page the hard way, on purpose.

        The header is rendered by the root layout, and /login sits under that
        same layout — so a client-side router.push("/") is a *shared-layout*
        transition and Next deliberately keeps the layout mounted rather than
        re-rendering it. The header therefore kept its signed-out render: the
        "Sign in" button stayed, and Shelf/Diary never appeared. router.refresh()
        does re-render layouts, but it refreshes the route you are still on, and
        racing it against a push to another route is why this only bit
        *sometimes* — the symptom cleared later because logging a game calls
        router.refresh() with no navigation racing it.

        A full document load re-runs the layout against the session cookie the
        browser client just wrote, which cannot be stale. Sign-in happens once
        per session, so the cost is irrelevant, and this is what sign-out has
        always done (a plain form POST) — which is why sign-out never had the bug.
      */
      window.location.assign("/");
      return;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setBusy(false);
      return;
    }
    // No `finally` resetting `busy`: on the success path the document is on its
    // way out and the button should stay disabled until it goes.
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      {mode === "signup" && (
        <input
          type="text"
          required
          maxLength={60}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          autoComplete="name"
          className="w-full rounded-sm border border-neutral-800 bg-surface-1 px-3.5 py-3 text-base text-neutral-100 outline-none transition-colors placeholder:text-neutral-600 focus:border-accent"
        />
      )}
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        className="w-full rounded-sm border border-neutral-800 bg-surface-1 px-3.5 py-3 text-base text-neutral-100 outline-none transition-colors placeholder:text-neutral-600 focus:border-accent"
      />
      <input
        type="password"
        required
        minLength={6}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        className="w-full rounded-sm border border-neutral-800 bg-surface-1 px-3.5 py-3 text-base text-neutral-100 outline-none transition-colors placeholder:text-neutral-600 focus:border-accent"
      />

      {error && <p className="text-sm text-red-600">{error}</p>}
      {message && <p className="text-sm text-green-600 dark:text-green-400">{message}</p>}

      <button
        type="submit"
        disabled={busy}
        className="px-cut w-full bg-accent py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-accent-foreground transition hover:brightness-110 disabled:opacity-50"
      >
        {busy ? "…" : mode === "signin" ? "Sign in" : "Create account"}
      </button>

      <button
        type="button"
        onClick={() => {
          setMode(mode === "signin" ? "signup" : "signin");
          setError(null);
          setMessage(null);
        }}
        className="w-full pt-1 text-center font-mono text-[11px] uppercase tracking-[0.15em] text-neutral-600 transition-colors hover:text-neutral-300"
      >
        {mode === "signin"
          ? "Need an account? Sign up"
          : "Already have an account? Sign in"}
      </button>
    </form>
  );
}
