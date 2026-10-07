/**
 * Handle rules, shared by the sign-up form (live feedback), the availability
 * endpoint, and ensureProfile (the only place a handle is actually claimed).
 * Deliberately has no server-only imports so the browser can run the same checks.
 */

export const HANDLE_MIN = 3;
export const HANDLE_MAX = 20;

/**
 * Names that would read as official, or that mean something to the site.
 * `user_<8 hex>` is separately reserved below: it is the shape of the
 * auto-generated placeholder, and letting someone pick one could collide with
 * a real account's fallback handle.
 */
const RESERVED = new Set([
  "admin", "administrator", "mod", "moderator", "staff", "team", "official",
  "gamelog", "support", "help", "contact", "security", "abuse", "root", "system",
  "api", "auth", "login", "logout", "signin", "signup", "settings", "privacy",
  "terms", "search", "releases", "shelf", "diary", "list", "lists", "developer",
  "me", "you", "null", "undefined",
]);

/** Lowercases and drops a leading @ — what people type is not what is stored. */
export function normalizeHandle(raw: string): string {
  return raw.trim().replace(/^@+/, "").toLowerCase();
}

/** A human-readable reason a handle can't be used, or null when it can. */
export function handleProblem(handle: string): string | null {
  if (handle.length < HANDLE_MIN) return `At least ${HANDLE_MIN} characters.`;
  if (handle.length > HANDLE_MAX) return `At most ${HANDLE_MAX} characters.`;
  if (!/^[a-z0-9_]+$/.test(handle)) return "Letters, numbers and underscores only.";
  if (RESERVED.has(handle) || /^user_[0-9a-f]{8}$/.test(handle)) return "That handle isn't available.";
  return null;
}
