import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, isNull, lt, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { calendarTokens } from "@/lib/db/schema";

/**
 * The feed URL is the credential — calendar apps can't send auth headers — so
 * it has to be unguessable and revocable. 32 random bytes is 256 bits; only
 * its SHA-256 is stored, and since the input is already high-entropy a plain
 * hash is enough (no salt or slow KDF needed).
 */
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Creates or replaces the user's token. The plaintext is returned once and never stored. */
export async function rotateToken(userId: string): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashToken(token);
  await db
    .insert(calendarTokens)
    .values({ userId, tokenHash })
    .onConflictDoUpdate({
      target: calendarTokens.userId,
      set: { tokenHash, createdAt: new Date(), lastUsedAt: null },
    });
  return token;
}

export async function revokeToken(userId: string): Promise<void> {
  await db.delete(calendarTokens).where(eq(calendarTokens.userId, userId));
}

export async function hasToken(userId: string): Promise<boolean> {
  const [row] = await db
    .select({ userId: calendarTokens.userId })
    .from(calendarTokens)
    .where(eq(calendarTokens.userId, userId))
    .limit(1);
  return row != null;
}

/** The owner of a token, or null when unknown or revoked. */
export async function userForToken(token: string): Promise<string | null> {
  // base64url of 32 bytes is 43 chars; reject anything else without a query.
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const tokenHash = hashToken(token);
  const [row] = await db
    .select({ userId: calendarTokens.userId })
    .from(calendarTokens)
    .where(eq(calendarTokens.tokenHash, tokenHash))
    .limit(1);
  if (!row) return null;

  // Calendar apps poll every few hours; recording every poll would make a
  // write per fetch. The hour-old guard keeps this to at most one write an hour.
  await db
    .update(calendarTokens)
    .set({ lastUsedAt: new Date() })
    .where(
      and(
        eq(calendarTokens.tokenHash, tokenHash),
        or(isNull(calendarTokens.lastUsedAt), lt(calendarTokens.lastUsedAt, sql`now() - interval '1 hour'`)),
      ),
    );
  return row.userId;
}
