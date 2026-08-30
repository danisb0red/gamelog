/**
 * Deterministic selection helpers for the personality layer.
 *
 * Why not Math.random(): these strings render on the server and hydrate on the
 * client. A random pick during a Client Component's first render produces
 * different markup on each side and React throws a hydration mismatch. So every
 * pick is a pure function of a seed, and callers choose the seed to control how
 * often a line changes:
 *
 *   - `hashSeed(game.name)` — stable forever. The same game always gets the
 *     same line, so it reads as authored rather than random.
 *   - `rotatingSeed()`      — changes a few times an hour. Server Components
 *     render once per request, so this is hydration-safe: the client reuses the
 *     server's HTML rather than re-picking.
 *   - a value from React state — for lines that appear after mount in response
 *     to user input (search results), where no server render exists to match.
 */

/** FNV-1a. Small, fast, and stable across runs — unlike String.hashCode-style sums. */
export function hashSeed(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * A seed that changes every ~20 minutes. Frequent enough that a refresh an hour
 * later feels different, slow enough that a quick reload doesn't look glitchy.
 */
export function rotatingSeed(): number {
  return Math.floor(Date.now() / (1000 * 60 * 20));
}

/** Pick one item from a pool. Same seed + same pool ⇒ same item, always. */
export function pick<T>(pool: readonly T[], seed: number): T {
  if (pool.length === 0) throw new Error("pick() called with an empty pool");
  return pool[Math.abs(seed) % pool.length];
}

/**
 * Pick, but only `chance` of the time — otherwise return null and let the
 * caller fall back to its plain copy.
 *
 * This is the knob that keeps the personality at ~15% of the interface. A joke
 * that fires every single time stops being a joke and becomes the UI.
 */
export function pickSometimes<T>(
  pool: readonly T[],
  seed: number,
  chance: number,
): T | null {
  // Use a different part of the seed for the gate than for the choice, so the
  // two decisions aren't correlated.
  const gate = (hashSeed(String(seed)) % 1000) / 1000;
  if (gate >= chance) return null;
  return pick(pool, seed);
}
