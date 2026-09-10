import "server-only";
import type { User } from "@supabase/supabase-js";
import { createClient } from "./supabase/server";
import { isNull, like, or } from "drizzle-orm";
import { db } from "./db";
import { profiles } from "./db/schema";

/** The authenticated user for the current request, or null. */
export async function getUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Ensures a profile row exists for a Supabase auth user. Idempotent — safe to
 * call on every authenticated request. Profiles share the auth user's id so
 * logs (which FK to profiles) line up with the real account.
 */
export async function ensureProfile(user: User): Promise<void> {
  const displayName = displayNameFor(user);

  const insert = db.insert(profiles).values({
    id: user.id,
    username: `user_${user.id.slice(0, 8)}`,
    displayName,
  });

  if (!displayName) {
    await insert.onConflictDoNothing();
    return;
  }

  // Accounts created before sign-up asked for a name stored the raw email
  // address as the display name, so profiles read "someone@gmail.com" on a
  // public page. Heal those on next sign-in — but only those: the condition
  // deliberately matches an empty name or one that still looks like an email,
  // so a name the user has actually chosen is never overwritten. Once healed
  // the row stops matching, and this becomes a plain no-op upsert.
  await insert.onConflictDoUpdate({
    target: profiles.id,
    set: { displayName },
    setWhere: or(isNull(profiles.displayName), like(profiles.displayName, "%@%")),
  });
}

/**
 * A human name for a user.
 *
 * Sign-up collects one and stores it in `user_metadata.display_name`. When it's
 * missing — accounts created before the field existed, or a provider that
 * doesn't supply one — fall back to the local part of the email rather than the
 * whole address: showing "someone@gmail.com" as a display name looks like a bug,
 * and it leaks an email address onto a public profile page.
 */
function displayNameFor(user: User): string | null {
  const meta = user.user_metadata as { display_name?: unknown } | null;
  const given = typeof meta?.display_name === "string" ? meta.display_name.trim() : "";
  if (given) return given.slice(0, 60);

  const local = user.email?.split("@")[0]?.trim();
  return local || null;
}

/**
 * The authenticated user for an API request, accepting either credential form.
 *
 * The web app authenticates with a Supabase session cookie. The iOS app has no
 * cookie jar — it holds a JWT from Supabase Auth and sends it as
 * `Authorization: Bearer <token>`. Both must resolve to the same user so that
 * every route handler keeps exactly one authorisation implementation.
 *
 * Bearer is checked first because its presence is an explicit signal; cookies
 * are the fallback so existing web behaviour is untouched.
 */
export async function getRequestUser(request: Request): Promise<User | null> {
  const header = request.headers.get("authorization");

  if (header?.toLowerCase().startsWith("bearer ")) {
    const token = header.slice(7).trim();
    if (!token) return null;

    // A tokenless client purely for validating the JWT. Supabase verifies the
    // signature server-side, so a forged token cannot pass here.
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { data, error } = await supabase.auth.getUser(token);
    return error ? null : data.user;
  }

  return getUser();
}
