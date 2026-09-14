import type { ReleaseEntry } from "@/lib/games/types";

/**
 * Release-calendar helpers shared by server and client.
 *
 * Every date here is a "YYYY-MM-DD" string treated as a UTC calendar day, and
 * arithmetic goes through Date.UTC. That is deliberate: IGDB stamps a release
 * at 00:00 UTC, and the moment one of these becomes a local Date it can slide
 * to the previous evening — Wolverine would show as out on the 14th in LA.
 */

export function todayUtc(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** Whole days from `from` to `to`; negative when `to` is earlier. */
export function daysBetween(from: string, to: string): number {
  const [y1, m1, d1] = from.split("-").map(Number);
  const [y2, m2, d2] = to.split("-").map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
}

/** "2026-09" for a month, validated; anything else falls back to this month. */
export function parseMonth(value: string | undefined, now = new Date()): string {
  if (value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value)) {
    const year = Number(value.slice(0, 4));
    if (year >= 1970 && year <= 2100) return value;
  }
  return todayUtc(now).slice(0, 7);
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 7);
}

export function monthBounds(month: string): { from: string; to: string } {
  return { from: `${month}-01`, to: `${shiftMonth(month, 1)}-01` };
}

/** Formatting with timeZone: "UTC" so a day never renders as the day before. */
export function formatDay(day: string, options: Intl.DateTimeFormatOptions): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-GB", { timeZone: "UTC", ...options });
}

export function relativeLabel(day: string, today: string): string | null {
  const n = daysBetween(today, day);
  if (n === 0) return "Today";
  if (n === 1) return "Tomorrow";
  if (n === -1) return "Yesterday";
  if (n > 1 && n <= 14) return `In ${n} days`;
  return null;
}

/**
 * Platform families for the filter chips.
 *
 * Filtering on raw abbreviations would mean a row of fifteen chips including
 * "Playdate" and "SMS". People pick a console family; cards still show the
 * exact platform, because "Switch 2" versus "Switch" is the whole story for
 * some releases.
 */
export const PLATFORM_FAMILIES = [
  { key: "playstation", label: "PlayStation", members: ["PS5", "PS4", "PSVR2"] },
  { key: "xbox", label: "Xbox", members: ["Series X|S", "XONE"] },
  { key: "switch", label: "Switch", members: ["Switch 2", "Switch"] },
  { key: "pc", label: "PC", members: ["PC", "Mac", "Linux", "Steam VR", "browser"] },
  { key: "mobile", label: "Mobile", members: ["iOS", "Android"] },
] as const;

export type PlatformFamily = (typeof PLATFORM_FAMILIES)[number]["key"];

export function inFamily(entry: ReleaseEntry, family: PlatformFamily): boolean {
  const members: readonly string[] = PLATFORM_FAMILIES.find((f) => f.key === family)!.members;
  return entry.platforms.some((p) => members.includes(p));
}

/** Card-level platform list: Mac and Linux fold into PC, consoles stay exact. */
export function displayPlatforms(platforms: string[]): string[] {
  const hasPc = platforms.includes("PC");
  const order = ["PS5", "PS4", "Series X|S", "XONE", "Switch 2", "Switch", "PC", "Mac", "Linux", "iOS", "Android"];
  return platforms
    .filter((p) => !(hasPc && (p === "Mac" || p === "Linux")))
    .sort((a, b) => (order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99));
}

export const KIND_LABEL: Record<ReleaseEntry["kind"], string | null> = {
  launch: null,
  "early-access": "Early access",
  "advanced-access": "Advanced access",
  "re-release": "New platforms",
};

/** Threshold for "Most anticipated" — roughly the top tenth of a month. */
export const BIG_RELEASE_HYPE = 10;

/**
 * One entry per game, for strips and the spotlight: a game with an Advanced
 * Access date and a launch date should appear once, on its launch.
 */
export function onePerGame(entries: ReleaseEntry[]): ReleaseEntry[] {
  const best = new Map<number, ReleaseEntry>();
  for (const e of entries) {
    const cur = best.get(e.game.id);
    const better =
      !cur ||
      (cur.kind !== "launch" && e.kind === "launch") ||
      (cur.kind === e.kind && e.date < cur.date);
    if (better) best.set(e.game.id, e);
  }
  return [...best.values()].sort((a, b) => a.date.localeCompare(b.date) || b.hype - a.hype);
}
