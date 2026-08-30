/**
 * UI copy for empty and loading states.
 *
 * This module used to hold rotating pools of "characterful" lines — things like
 * "No active quests", "Your backlog is suspiciously healthy", "Reticulating
 * splines…". They were removed deliberately. Read together they didn't read as
 * a person with taste, they read as a website trying to prove it likes games,
 * which is worse than saying nothing.
 *
 * The rule now: one plain, true sentence per state. GameLog's personality comes
 * from the artwork, the materials and the small visual details — not from the
 * interface talking.
 *
 * Kept as a centralised module (rather than inlined strings) so copy stays in
 * one place and the call sites don't change. Pools are single-entry by design:
 * if you find yourself adding a second, funnier variant, don't.
 */

export type MessageContext =
  // Search
  | "search.loading"
  | "search.empty"
  // Empty states
  | "empty.playing"
  | "empty.backlog"
  | "empty.finished"
  | "empty.dropped"
  | "empty.replaying"
  | "empty.library"
  | "empty.activity"
  | "empty.diary"
  | "empty.reviews"
  | "empty.lists"
  | "empty.listItems"
  | "empty.favorites"
  | "empty.developer"
  // Generic loading
  | "loading";

export const MESSAGES: Record<MessageContext, readonly string[]> = {
  "search.loading": ["Searching…"],
  "search.empty": ["No games found."],

  "empty.playing": ["Nothing in progress."],
  "empty.backlog": ["Nothing in the backlog."],
  "empty.finished": ["Nothing finished yet."],
  "empty.dropped": ["Nothing dropped."],
  "empty.replaying": ["Nothing being replayed."],
  "empty.library": ["No games here yet."],
  "empty.activity": ["Nothing logged yet."],
  "empty.diary": ["No entries yet."],
  "empty.reviews": ["No reviews yet."],
  "empty.lists": ["No lists yet."],
  "empty.listItems": ["No games yet."],
  "empty.favorites": ["No favorites yet."],
  "empty.developer": ["No games found."],

  loading: ["Loading…"],
};

/** The plain line for a context. */
export function plainMessage(context: MessageContext): string {
  return MESSAGES[context][0];
}
