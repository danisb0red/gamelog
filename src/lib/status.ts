/** Log statuses with display labels and badge colors, shared across the UI. */

export const STATUSES = [
  "playing",
  "backlog",
  "finished",
  "replaying",
  "dropped",
] as const;

export type Status = (typeof STATUSES)[number];

export const STATUS_LABEL: Record<Status, string> = {
  playing: "Playing",
  backlog: "Backlog",
  finished: "Finished",
  replaying: "Replaying",
  dropped: "Dropped",
};

/**
 * Status as a colour language.
 *
 * Each status owns one hue and is used consistently across pips, meters, glows
 * and badges, so a shelf can be read by colour before any label is read.
 * The hues are chosen for meaning, not variety: playing is energetic, finished
 * is warm and settled, backlog is cool and waiting.
 */
export const STATUS_BADGE: Record<Status, string> = {
  playing: "bg-status-playing",
  backlog: "bg-status-backlog",
  finished: "bg-status-finished",
  replaying: "bg-status-replaying",
  dropped: "bg-status-dropped",
};

/** Text colour counterpart, for labels and numerals. */
export const STATUS_TEXT: Record<Status, string> = {
  playing: "text-status-playing",
  backlog: "text-status-backlog",
  finished: "text-status-finished",
  replaying: "text-status-replaying",
  dropped: "text-status-dropped",
};

/** Raw hex, for inline styles (meter segments, glows) where a class won't do. */
export const STATUS_HEX: Record<Status, string> = {
  playing: "#5fd48a",
  backlog: "#8a8fd4",
  finished: "#f2b53f",
  replaying: "#c07ce0",
  dropped: "#c96a6a",
};

/**
 * Verb form, for the activity timeline. Reading "finished Celeste" is a
 * sentence; reading "Finished · Celeste" is a database row.
 */
export const STATUS_VERB: Record<Status, string> = {
  playing: "started playing",
  backlog: "shelved",
  finished: "finished",
  replaying: "went back to",
  dropped: "dropped",
};

export function isStatus(value: string | undefined): value is Status {
  return !!value && (STATUSES as readonly string[]).includes(value);
}
