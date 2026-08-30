/**
 * GameLog's personality layer.
 *
 * One import point for the UI's non-literal strings — empty states and loading
 * lines. Components ask for a message by *context*, not by content, so the voice
 * can be retuned or dialled down from here without touching a component.
 *
 *   getMessage("empty.backlog")   → a rotating empty-state line
 *   getLoadingMessage()           → a rotating loading line
 *
 * Per-game written one-liners used to live here too and have been removed;
 * game-specific references are visual only now (see ./references.ts and
 * <GameSigil>).
 *
 * Everything is deterministic given a seed; see ./seed.ts for why that matters
 * (short version: hydration).
 */

import { MESSAGES, plainMessage, type MessageContext } from "./messages";
import { findReference } from "./references";
import { hashSeed, pick, rotatingSeed } from "./seed";

export type { MessageContext } from "./messages";
export type { GameReference, SigilId } from "./references";
export { MESSAGES } from "./messages";
export { GAME_REFERENCES, findReference } from "./references";
export { hashSeed, pick, pickSometimes, rotatingSeed } from "./seed";

/**
 * A rotating message for a UI context.
 *
 * @param context which surface is asking
 * @param seed    omit to rotate every ~20 min; pass a stable seed to freeze it
 */
export function getMessage(context: MessageContext, seed = rotatingSeed()): string {
  return pick(MESSAGES[context], seed);
}

/** The plain, personality-free line for a context. */
export { plainMessage };

/** A rotating generic loading line. */
export function getLoadingMessage(seed = rotatingSeed()): string {
  return pick(MESSAGES.loading, seed);
}

/** A rotating search-loading line. */
export function getSearchLoadingMessage(seed = rotatingSeed()): string {
  return pick(MESSAGES["search.loading"], seed);
}

/**
 * The "no results" line for a search.
 *
 * Seeded by the query itself, so hammering the same nonsense search doesn't
 * cycle messages at you — that would look broken rather than playful.
 */
export function getSearchEmptyMessage(query: string): string {
  return pick(MESSAGES["search.empty"], hashSeed(query.toLowerCase().trim()));
}

/** Does this title have a visual motif attached? */
export function hasReference(title: string | null | undefined): boolean {
  return !!title && findReference(title) !== null;
}
