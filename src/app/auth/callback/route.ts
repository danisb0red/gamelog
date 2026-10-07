import { type EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Where emailed links land: sign-up confirmation and password reset.
 *
 * Until this existed, a confirmation link dropped people on the home page signed
 * out with a token sitting in the address bar — nothing was listening for it.
 *
 * Two shapes arrive here:
 *  - `?code=…` (PKCE, the @supabase/ssr default). Exchanging it needs the
 *    verifier cookie set by the browser that *asked* for the email, so opening
 *    the link on a different device fails the exchange.
 *  - `?token_hash=…&type=…` (verifyOtp). No cookie needed, so it works on any
 *    device. It needs the email templates to link here with those params, which
 *    is a dashboard change — supported now so that change is all that's needed.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const next = safeNext(params.get("next"));
  const flow = params.get("flow");
  const supabase = await createClient();

  // Supabase reports its own failures (expired, already-used link) in the query.
  if (params.get("error") || params.get("error_code")) {
    redirect(failure(next));
  }

  const tokenHash = params.get("token_hash");
  const type = params.get("type") as EmailOtpType | null;
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    redirect(error ? failure(next) : next);
  }

  const code = params.get("code");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) redirect(next);
    // A code only exists once Supabase has verified the link, so for sign-up the
    // email *is* confirmed — the exchange just had no cookie to finish with
    // (link opened on another device). Say that, not "something went wrong".
    redirect(flow === "signup" ? "/login?notice=confirmed" : failure(next));
  }

  redirect(failure(next));
}

/** Only same-site paths: `next` must never turn this into an open redirect. */
function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return "/";
  return raw;
}

/** A dead reset link goes back to the reset form; anything else to plain sign-in. */
function failure(next: string): string {
  return next.startsWith("/reset-password")
    ? "/login?mode=forgot&notice=expired"
    : "/login?notice=expired";
}
