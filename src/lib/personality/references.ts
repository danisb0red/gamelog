/**
 * Game- and franchise-specific visual motifs.
 *
 * This registry used to also carry written one-liners for search results, game
 * pages and save confirmations. Those are gone — the references here are purely
 * visual now, rendered by <GameSigil> as a small pixel mark beside a title.
 *
 * An icon can't over-explain itself or try too hard, which is what the written
 * version kept doing. A bonfire next to Dark Souls either lands or reads as a
 * small ornament; either way it never talks.
 *
 * Matching is first-wins, so specific entries precede broad franchise ones.
 * Keep patterns tight enough to avoid catching unrelated titles.
 */

/** Visual motif ids, rendered by <GameSigil>. */
export type SigilId =
  | "bonfire"
  | "heart"
  | "ball"
  | "block"
  | "iris"
  | "alert"
  | "typewriter"
  | "vault"
  | "sprout"
  | "stars"
  | "star";

export type GameReference = {
  /** Stable id for the entry. */
  id: string;
  match: RegExp;
  /** Pixel motif shown next to the title. */
  sigil: SigilId;
  /** Plain description of the icon — its tooltip and accessible label. */
  sigilTitle: string;
};

export const GAME_REFERENCES: readonly GameReference[] = [
  // ── Specific titles ────────────────────────────────────────────────
  {
    id: "hollow-knight",
    match: /\bhollow knight\b/i,
    sigil: "bonfire",
    sigilTitle: "Bench",
  },
  {
    id: "minecraft",
    match: /\bminecraft\b/i,
    sigil: "block",
    sigilTitle: "Grass block",
  },
  {
    id: "portal",
    // Anchored, and explicitly not Portal Knights — a different game that would
    // otherwise inherit Valve's motif.
    match: /^portal\b(?!\s+knights)/i,
    sigil: "iris",
    sigilTitle: "Aperture",
  },
  {
    id: "stardew",
    match: /\bstardew\b/i,
    sigil: "sprout",
    sigilTitle: "Sprout",
  },

  // ── Franchises ─────────────────────────────────────────────────────
  {
    id: "fromsoft",
    match: /\b(dark souls|elden ring|bloodborne|sekiro|demon'?s souls|armored core)\b/i,
    sigil: "bonfire",
    sigilTitle: "Bonfire",
  },
  {
    id: "gta",
    match: /\b(grand theft auto|gta)\b/i,
    sigil: "stars",
    sigilTitle: "Wanted level",
  },
  {
    id: "elder-scrolls",
    match: /\b(skyrim|elder scrolls|oblivion|morrowind)\b/i,
    sigil: "star",
    sigilTitle: "Skill star",
  },
  {
    id: "zelda",
    match: /\b(zelda|breath of the wild|tears of the kingdom)\b/i,
    sigil: "heart",
    sigilTitle: "Heart container",
  },
  {
    id: "pokemon",
    match: /\bpok[eé]mon\b/i,
    sigil: "ball",
    sigilTitle: "Poké Ball",
  },
  {
    id: "fallout",
    match: /\bfallout\b/i,
    sigil: "vault",
    sigilTitle: "Vault door",
  },
  {
    id: "resident-evil",
    match: /\b(resident evil|biohazard)\b/i,
    sigil: "typewriter",
    sigilTitle: "Typewriter",
  },
  {
    id: "metal-gear",
    match: /\bmetal gear\b/i,
    sigil: "alert",
    sigilTitle: "Alert",
  },
];

/** Find the motif for a title, if one exists. First match wins. */
export function findReference(title: string): GameReference | null {
  if (!title) return null;
  return GAME_REFERENCES.find((r) => r.match.test(title)) ?? null;
}
