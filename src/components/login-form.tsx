"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { HANDLE_MAX, handleProblem, normalizeHandle } from "@/lib/handle";

export type AuthMode = "signin" | "signup" | "forgot";
export type AuthNotice = { tone: "ok" | "error"; text: string } | null;

const field =
  "w-full rounded-sm border border-neutral-800 bg-surface-1 px-3.5 py-3 text-base text-neutral-100 outline-none transition-colors placeholder:text-neutral-600 focus:border-accent";

const COPY: Record<AuthMode, { title: string; blurb: string }> = {
  signin: { title: "Sign in", blurb: "Or create an account to start logging." },
  signup: { title: "Create your account", blurb: "Free, no ads. It takes under a minute." },
  forgot: { title: "Reset your password", blurb: "Enter your email and we'll send you a link." },
};

/**
 * Supabase's messages are written for developers ("Invalid login credentials",
 * "email rate limit exceeded"). Say what happened and what to do instead; fall
 * through to the raw text only for the cases nobody has mapped yet.
 */
function explain(err: unknown, fallback = "Something went wrong. Try again."): string {
  const code = (err as { code?: string } | null)?.code;
  switch (code) {
    case "invalid_credentials":
      return "That email and password don't match.";
    case "email_not_confirmed":
      return "Confirm your email first. The link can take a minute to arrive, and it may land in spam.";
    case "user_already_exists":
      return "There's already an account with that email. Try signing in.";
    case "weak_password":
      return "That password is too easy to guess. Try a longer one.";
    case "over_email_send_rate_limit":
      return "We're sending a lot of email right now. Try again in a little while.";
    case "over_request_rate_limit":
      return "Too many attempts. Wait a minute and try again.";
    case "email_address_invalid":
      return "That doesn't look like a valid email address.";
    case "signup_disabled":
      return "Sign-ups are closed right now.";
  }
  return err instanceof Error && err.message ? err.message : fallback;
}

type HandleCheck = { handle: string; state: "ok" | "taken" | "unknown"; reason: string | null };

export function LoginForm({
  initialMode = "signin",
  notice = null,
}: {
  initialMode?: AuthMode;
  notice?: AuthNotice;
}) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [name, setName] = useState("");
  const [handleRaw, setHandleRaw] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(notice?.tone === "ok" ? notice.text : null);
  const [error, setError] = useState<string | null>(notice?.tone === "error" ? notice.text : null);
  /** Offer "resend" once a confirmation email has been sent or is outstanding. */
  const [resendable, setResendable] = useState(false);
  const [check, setCheck] = useState<HandleCheck | null>(null);

  // Derived, not stored: the feedback under the field is a pure function of what
  // is typed, plus the latest answer from the server for *that* handle.
  const handle = normalizeHandle(handleRaw);
  const localProblem = handle ? handleProblem(handle) : null;
  const serverSays = check && check.handle === handle ? check : null;

  useEffect(() => {
    if (mode !== "signup" || !handle || localProblem) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/handle?u=${encodeURIComponent(handle)}`, { signal: controller.signal });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as { available: boolean; reason: string | null };
        setCheck({ handle, state: data.available ? "ok" : "taken", reason: data.reason });
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        // Couldn't ask. Don't block sign-up on it — ensureProfile is the real
        // gatekeeper and will fall back if the handle turns out to be taken.
        setCheck({ handle, state: "unknown", reason: null });
      }
    }, 400);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [mode, handle, localProblem]);

  function switchMode(next: AuthMode) {
    setMode(next);
    setError(null);
    setMessage(null);
    setShowPassword(false);
  }

  /** One authoritative look at the handle right before submitting. */
  async function handleIsFree(): Promise<boolean> {
    if (serverSays?.state === "ok") return true;
    if (serverSays?.state === "taken") return false;
    try {
      const res = await fetch(`/api/handle?u=${encodeURIComponent(handle)}`);
      if (!res.ok) return true; // couldn't tell: let the server-side fallback decide
      return ((await res.json()) as { available: boolean }).available;
    } catch {
      return true;
    }
  }

  async function resend() {
    setBusy(true);
    setError(null);
    try {
      const { error } = await createClient().auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback?flow=signup` },
      });
      if (error) throw error;
      setMessage("Sent. Check your inbox, and your spam folder.");
    } catch (err) {
      setError(explain(err, "Couldn't send that email. Try again later."));
    } finally {
      setBusy(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    const supabase = createClient();

    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
        });
        if (error) throw error;
        // Worded so it is true whether or not the address has an account —
        // otherwise this form is a way to find out who is registered.
        setMessage("If there's an account for that address, a reset link is on its way. Check spam too.");
        setBusy(false);
        return;
      }

      if (mode === "signup") {
        const problem = handleProblem(handle);
        if (problem) {
          setError(problem);
          setBusy(false);
          return;
        }
        if (!(await handleIsFree())) {
          setError("That handle is taken. Pick another.");
          setBusy(false);
          return;
        }

        // The name and handle are stored on the auth user, not written straight
        // to the profiles table, because sign-up may not produce a session yet
        // (email confirmation). Keeping them in user_metadata means
        // ensureProfile can pick them up whenever the user actually arrives.
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: name.trim(), username: handle },
            emailRedirectTo: `${window.location.origin}/auth/callback?flow=signup`,
          },
        });
        if (error) throw error;

        // With confirmation on, signing up an address that already has an
        // account "succeeds" with no identities, to avoid revealing it exists.
        if (data.user && (data.user.identities?.length ?? 1) === 0) {
          setError(explain({ code: "user_already_exists" }));
          setBusy(false);
          return;
        }
        // Confirmation on: no session yet.
        if (!data.session) {
          setMode("signin");
          setMessage("Check your email to confirm your account. It can take a minute, and may land in spam.");
          setResendable(true);
          setBusy(false);
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          if ((error as { code?: string }).code === "email_not_confirmed") setResendable(true);
          throw error;
        }
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
      setError(explain(err, mode === "forgot" ? "Couldn't send that email. Try again later." : undefined));
      setBusy(false);
      return;
    }
    // No `finally` resetting `busy`: on the success path the document is on its
    // way out and the button should stay disabled until it goes.
  }

  const { title, blurb } = COPY[mode];
  const busyLabel = mode === "signin" ? "Signing in…" : mode === "signup" ? "Creating account…" : "Sending…";
  const idleLabel = mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link";

  return (
    <>
      <div>
        <h1 className="font-display text-4xl font-bold tracking-tight text-neutral-50">{title}</h1>
        <p className="mt-2.5 text-[15px] text-neutral-400">{blurb}</p>
      </div>

      <form onSubmit={submit} className="space-y-3">
        {mode === "signup" && (
          <>
            <input
              type="text"
              required
              maxLength={60}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              autoComplete="name"
              className={field}
            />
            <div>
              <div className="relative">
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-base text-neutral-500"
                >
                  @
                </span>
                <input
                  type="text"
                  required
                  value={handleRaw}
                  onChange={(e) => setHandleRaw(e.target.value.toLowerCase())}
                  placeholder="handle"
                  aria-label="Handle"
                  aria-describedby="handle-hint"
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  maxLength={HANDLE_MAX + 1}
                  className={`${field} pl-8`}
                />
              </div>
              <p
                id="handle-hint"
                aria-live="polite"
                className={`mt-1.5 px-0.5 text-[13px] ${
                  !handle
                    ? "text-neutral-500"
                    : localProblem || serverSays?.state === "taken"
                      ? "text-status-dropped"
                      : serverSays?.state === "ok"
                        ? "text-status-playing"
                        : "text-neutral-500"
                }`}
              >
                {!handle
                  ? "This is your profile address. 3–20 letters, numbers or underscores."
                  : localProblem
                    ? localProblem
                    : serverSays?.state === "taken"
                      ? "That handle is taken."
                      : serverSays?.state === "ok"
                        ? `@${handle} is available.`
                        : "Checking…"}
              </p>
            </div>
          </>
        )}

        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          aria-label="Email"
          autoComplete="email"
          inputMode="email"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className={field}
        />

        {mode !== "forgot" && (
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              aria-label="Password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              className={`${field} pr-16`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-pressed={showPassword}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute inset-y-0 right-0 flex w-16 items-center justify-center font-mono text-[10px] uppercase tracking-[0.12em] text-neutral-500 transition-colors hover:text-neutral-200"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        )}

        {mode === "signin" && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => switchMode("forgot")}
              className="min-h-11 px-1 text-[13px] text-neutral-400 underline-offset-4 transition-colors hover:text-neutral-100 hover:underline"
            >
              Forgot password?
            </button>
          </div>
        )}

        {error && (
          <p role="alert" className="text-sm text-status-dropped">
            {error}
          </p>
        )}
        {message && (
          <p role="status" className="text-sm text-status-playing">
            {message}
          </p>
        )}
        {resendable && mode === "signin" && (
          <button
            type="button"
            onClick={resend}
            disabled={busy || !email}
            className="min-h-11 text-[13px] text-neutral-300 underline underline-offset-4 transition-colors hover:text-neutral-50 disabled:opacity-50"
          >
            Didn&apos;t get it? Send the confirmation email again
          </button>
        )}

        <button
          type="submit"
          disabled={busy}
          className="px-cut w-full bg-accent py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-accent-foreground transition hover:brightness-110 disabled:opacity-50"
        >
          {busy ? busyLabel : idleLabel}
        </button>

        {mode === "signup" && (
          <p className="px-0.5 text-center text-[12px] leading-relaxed text-neutral-500">
            By creating an account you accept the{" "}
            <Link href="/privacy" className="underline underline-offset-4 hover:text-neutral-300">
              privacy policy
            </Link>
            .
          </p>
        )}

        <button
          type="button"
          onClick={() => switchMode(mode === "signin" ? "signup" : "signin")}
          className="min-h-11 w-full pt-1 text-center font-mono text-[11px] uppercase tracking-[0.15em] text-neutral-500 transition-colors hover:text-neutral-300"
        >
          {mode === "signin"
            ? "Need an account? Sign up"
            : mode === "signup"
              ? "Already have an account? Sign in"
              : "Back to sign in"}
        </button>
      </form>
    </>
  );
}
