import type { ReleaseEntry } from "@/lib/games/types";
import { KIND_LABEL, addDays, displayPlatforms, todayUtc } from "@/lib/releases";

/**
 * iCalendar (RFC 5545) output for the release feed. Pure — no I/O — so the
 * escaping, folding and event-picking can be tested by calling it directly.
 *
 * Events are all-day, with no time zone anywhere. That matches how release days
 * are stored (UTC calendar days): a floating date means "the 14th" to every
 * viewer, where a timestamp would slide to the 13th west of Greenwich.
 */

const CRLF = "\r\n";
const encoder = new TextEncoder();

/** TEXT values (RFC 5545 §3.3.11): backslash, semicolon, comma and newlines. */
export function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

/**
 * Fold a content line at 75 octets (§3.1). The limit is bytes, not characters,
 * and a UTF-8 sequence must never be split across two lines — so walk by code
 * point and count each one's encoded length. Continuation lines start with a
 * space, which itself counts toward their 75.
 */
export function foldLine(line: string): string {
  if (encoder.encode(line).length <= 75) return line;
  const lines: string[] = [];
  let current = "";
  let used = 0;
  for (const ch of line) {
    const size = encoder.encode(ch).length;
    const limit = lines.length === 0 ? 75 : 74;
    if (used + size > limit) {
      lines.push(current);
      current = "";
      used = 0;
    }
    current += ch;
    used += size;
  }
  lines.push(current);
  return lines.join(CRLF + " ");
}

function compact(day: string): string {
  return day.replaceAll("-", "");
}

/**
 * One event per game: its next launch, else its earliest upcoming entry of any
 * kind (an early-access date is still worth a calendar slot when there is no
 * launch date yet). A game whose only dates are behind us keeps its most
 * recent one, so something that just released stays put for the window's
 * 14-day tail instead of vanishing overnight.
 */
export function pickEvents(entries: ReleaseEntry[], today: string): ReleaseEntry[] {
  const byGame = new Map<number, ReleaseEntry[]>();
  for (const e of entries) byGame.set(e.game.id, [...(byGame.get(e.game.id) ?? []), e]);

  const picked: ReleaseEntry[] = [];
  for (const list of byGame.values()) {
    const upcoming = list.filter((e) => e.date >= today).sort((a, b) => a.date.localeCompare(b.date));
    const pick =
      upcoming.find((e) => e.kind === "launch") ??
      upcoming[0] ??
      [...list].sort((a, b) => b.date.localeCompare(a.date))[0];
    picked.push(pick);
  }
  return picked.sort((a, b) => a.date.localeCompare(b.date) || a.game.name.localeCompare(b.game.name));
}

export function buildCalendar({
  entries,
  origin,
  now = new Date(),
}: {
  entries: ReleaseEntry[];
  /** Site origin, e.g. "https://gamelog-liard.vercel.app". Also supplies the UID domain. */
  origin: string;
  now?: Date;
}): string {
  const host = new URL(origin).host;
  const today = todayUtc(now);
  // Midnight of today rather than the instant of the request: DTSTAMP moving on
  // every poll would make each fetch look like a change to a diffing client.
  const stamp = `${compact(today)}T000000Z`;

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//GameLog//Release calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:GameLog releases",
    "X-WR-CALDESC:Upcoming releases from your wishlist and shelf",
    "REFRESH-INTERVAL;VALUE=DURATION:PT12H",
    "X-PUBLISHED-TTL:PT12H",
  ];

  for (const e of pickEvents(entries, today)) {
    const platforms = displayPlatforms(e.platforms).join(", ");
    const kind = KIND_LABEL[e.kind];
    const qualifiers = [kind, e.region, platforms].filter(Boolean).join(" · ");
    const url = `${origin}/g/${e.game.slug}`;
    const detail = [qualifiers, url].filter(Boolean).join("\n");

    lines.push(
      "BEGIN:VEVENT",
      // Per game, not per date: when IGDB moves the release the same UID comes
      // back with a new DTSTART and the calendar updates the event in place.
      `UID:game-${e.game.id}@${host}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${compact(e.date)}`,
      // DTEND is exclusive for all-day events.
      `DTEND;VALUE=DATE:${compact(addDays(e.date, 1))}`,
      `SUMMARY:${escapeText(qualifiers ? `${e.game.name} (${qualifiers})` : e.game.name)}`,
      `DESCRIPTION:${escapeText(detail)}`,
      `URL:${url}`,
      // A release day is a reminder, not a commitment: never show the user busy.
      "TRANSP:TRANSPARENT",
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join(CRLF) + CRLF;
}
