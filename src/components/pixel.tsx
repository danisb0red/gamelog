/**
 * Pixel sprite kit.
 *
 * Hand-plotted rectangles on small integer grids, rendered as inline SVG with
 * `shape-rendering: crispEdges` so they stay hard-edged at any size. No pixel
 * font, no pixel borders, no 8-bit palette — the sprites inherit `currentColor`
 * and sit inside an otherwise modern interface.
 *
 * That restraint is the whole idea: a premium editorial site that occasionally
 * reveals it has a Game Boy hiding underneath.
 */

type SpriteProps = {
  size?: number;
  className?: string;
  title?: string;
};

function Sprite({
  size = 12,
  className = "",
  title,
  viewBox,
  children,
}: SpriteProps & { viewBox: string; children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={viewBox}
      className={`pixel inline-block ${className}`}
      fill="currentColor"
      aria-hidden={title ? undefined : "true"}
      role={title ? "img" : undefined}
      focusable="false"
    >
      {title && <title>{title}</title>}
      {children}
    </svg>
  );
}

/** 3.5" floppy — the universal save icon, still legible at 10px. */
export function PixelSave(props: SpriteProps) {
  return (
    <Sprite {...props} viewBox="0 0 11 11">
      <path d="M0 0h9l2 2v9H0V0z" />
      <rect x="3" y="1" width="4" height="3" fill="var(--surface-2, #221d19)" />
      <rect x="5" y="1" width="1" height="3" fill="currentColor" opacity="0.5" />
      <rect x="2" y="6" width="7" height="5" fill="var(--surface-2, #221d19)" />
      <rect x="3" y="7" width="5" height="1" fill="currentColor" opacity="0.6" />
      <rect x="3" y="9" width="3" height="1" fill="currentColor" opacity="0.6" />
    </Sprite>
  );
}

/** Classic 8-bit heart. Used as a hidden mark and for the Zelda sigil. */
export function PixelHeart(props: SpriteProps) {
  return (
    <Sprite {...props} viewBox="0 0 9 8">
      <rect x="1" y="1" width="2" height="1" />
      <rect x="6" y="1" width="2" height="1" />
      <rect x="0" y="2" width="4" height="1" />
      <rect x="5" y="2" width="4" height="1" />
      <rect x="0" y="3" width="9" height="1" />
      <rect x="1" y="4" width="7" height="1" />
      <rect x="2" y="5" width="5" height="1" />
      <rect x="3" y="6" width="3" height="1" />
      <rect x="4" y="7" width="1" height="1" />
    </Sprite>
  );
}

/** Notched cartridge. The wordmark's blocky sibling. */
export function PixelCartridge(props: SpriteProps) {
  return (
    <Sprite {...props} viewBox="0 0 10 11">
      <path d="M0 0h10v8l-3 3H0V0z" />
      <rect x="2" y="2" width="6" height="3" fill="var(--surface-2, #221d19)" />
      <rect x="2" y="7" width="3" height="1" fill="var(--surface-2, #221d19)" />
    </Sprite>
  );
}

/** Flame — the bonfire sigil. Pair with `.ember` for the flicker. */
export function PixelFlame(props: SpriteProps) {
  return (
    <Sprite {...props} viewBox="0 0 7 10">
      <rect x="3" y="0" width="1" height="2" />
      <rect x="2" y="2" width="3" height="1" />
      <rect x="2" y="3" width="1" height="1" />
      <rect x="4" y="3" width="1" height="1" />
      <rect x="1" y="4" width="5" height="3" />
      <rect x="2" y="7" width="3" height="1" />
      <rect x="0" y="9" width="7" height="1" opacity="0.55" />
    </Sprite>
  );
}

/** Five-point star, used for wanted level and skill-perk motifs. */
export function PixelStar(props: SpriteProps) {
  return (
    <Sprite {...props} viewBox="0 0 9 9">
      <rect x="4" y="0" width="1" height="9" />
      <rect x="0" y="4" width="9" height="1" />
      <rect x="1" y="1" width="7" height="7" opacity="0" />
      <rect x="3" y="2" width="3" height="5" />
      <rect x="2" y="3" width="5" height="3" />
    </Sprite>
  );
}

/** Grass block — Minecraft, at a glance and only at a glance. */
export function PixelBlock(props: SpriteProps) {
  return (
    <Sprite {...props} viewBox="0 0 10 10">
      <rect x="0" y="0" width="10" height="3" />
      <rect x="0" y="3" width="10" height="7" opacity="0.45" />
      <rect x="2" y="4" width="2" height="2" opacity="0.5" />
      <rect x="6" y="6" width="2" height="2" opacity="0.5" />
    </Sprite>
  );
}

/** Aperture-ish iris — Portal. */
export function PixelIris(props: SpriteProps) {
  return (
    <Sprite {...props} viewBox="0 0 11 11">
      <rect x="4" y="0" width="3" height="1" />
      <rect x="4" y="10" width="3" height="1" />
      <rect x="0" y="4" width="1" height="3" />
      <rect x="10" y="4" width="1" height="3" />
      <rect x="2" y="1" width="2" height="1" />
      <rect x="7" y="1" width="2" height="1" />
      <rect x="2" y="9" width="2" height="1" />
      <rect x="7" y="9" width="2" height="1" />
      <rect x="1" y="2" width="1" height="2" />
      <rect x="9" y="2" width="1" height="2" />
      <rect x="1" y="7" width="1" height="2" />
      <rect x="9" y="7" width="1" height="2" />
      <rect x="4" y="4" width="3" height="3" />
    </Sprite>
  );
}

/** The alert bang — Metal Gear. */
export function PixelAlert(props: SpriteProps) {
  return (
    <Sprite {...props} viewBox="0 0 3 10">
      <rect x="0" y="0" width="3" height="6" />
      <rect x="0" y="8" width="3" height="2" />
    </Sprite>
  );
}

/** Poké ball. */
export function PixelBall(props: SpriteProps) {
  return (
    <Sprite {...props} viewBox="0 0 11 11">
      <rect x="3" y="0" width="5" height="1" />
      <rect x="1" y="1" width="9" height="3" />
      <rect x="0" y="4" width="11" height="1" />
      <rect x="0" y="5" width="11" height="1" opacity="0.35" />
      <rect x="1" y="6" width="9" height="3" opacity="0.35" />
      <rect x="3" y="9" width="5" height="1" opacity="0.35" />
      <rect x="4" y="4" width="3" height="3" fill="var(--surface-2, #221d19)" />
      <rect x="5" y="5" width="1" height="1" />
    </Sprite>
  );
}

/** Typewriter key — Resident Evil's save room. */
export function PixelTypewriter(props: SpriteProps) {
  return (
    <Sprite {...props} viewBox="0 0 11 9">
      <rect x="2" y="0" width="7" height="1" />
      <rect x="1" y="1" width="9" height="2" opacity="0.5" />
      <rect x="0" y="4" width="11" height="3" />
      <rect x="2" y="5" width="1" height="1" fill="var(--surface-2, #221d19)" />
      <rect x="4" y="5" width="1" height="1" fill="var(--surface-2, #221d19)" />
      <rect x="6" y="5" width="1" height="1" fill="var(--surface-2, #221d19)" />
      <rect x="8" y="5" width="1" height="1" fill="var(--surface-2, #221d19)" />
      <rect x="3" y="8" width="5" height="1" opacity="0.6" />
    </Sprite>
  );
}

/** Vault door — Fallout. */
export function PixelVault(props: SpriteProps) {
  return (
    <Sprite {...props} viewBox="0 0 11 11">
      <rect x="3" y="0" width="5" height="1" />
      <rect x="1" y="1" width="9" height="1" />
      <rect x="0" y="2" width="11" height="7" />
      <rect x="1" y="9" width="9" height="1" />
      <rect x="3" y="10" width="5" height="1" />
      <rect x="4" y="4" width="3" height="3" fill="var(--surface-2, #221d19)" />
      <rect x="5" y="2" width="1" height="2" fill="var(--surface-2, #221d19)" />
      <rect x="5" y="7" width="1" height="2" fill="var(--surface-2, #221d19)" />
    </Sprite>
  );
}

/**
 * Memory card. The notched corner and contact strip are the whole silhouette —
 * anyone who owned a PS1/PS2 recognises it at 12px; everyone else sees a small
 * technical glyph next to a save date, which is exactly what it is.
 */
export function PixelMemoryCard(props: SpriteProps) {
  return (
    <Sprite {...props} viewBox="0 0 10 12">
      <path d="M0 0h7l3 3v9H0V0z" />
      <rect x="2" y="5" width="6" height="1" fill="var(--surface-2, #262019)" />
      <rect x="2" y="7" width="6" height="1" fill="var(--surface-2, #262019)" />
      <rect x="2" y="9" width="6" height="1" fill="var(--surface-2, #262019)" />
    </Sprite>
  );
}

/** Crossed-out sprout — Stardew's calendar. */
export function PixelSprout(props: SpriteProps) {
  return (
    <Sprite {...props} viewBox="0 0 9 10">
      <rect x="4" y="3" width="1" height="7" />
      <rect x="1" y="1" width="3" height="1" />
      <rect x="0" y="2" width="3" height="1" />
      <rect x="1" y="3" width="3" height="1" />
      <rect x="5" y="3" width="3" height="1" />
      <rect x="6" y="4" width="3" height="1" />
      <rect x="5" y="5" width="3" height="1" />
    </Sprite>
  );
}

/* ── Interface marks ─────────────────────────────────────────────────────
   The second half of the set: symbols the UI actually needs, drawn on the same
   grid as the game motifs above so everything looks like one hand. These are
   deliberately not emoji — emoji carry someone else's style and break the
   moment they render on a different OS. */

/** Controller. The set's mascot; sits beside collection metadata. */
export function PixelController(props: SpriteProps) {
  return (
    <Sprite {...props} viewBox="0 0 14 9">
      <rect x="2" y="1" width="10" height="1" />
      <rect x="1" y="2" width="12" height="4" />
      <rect x="0" y="3" width="1" height="4" />
      <rect x="13" y="3" width="1" height="4" />
      <rect x="1" y="6" width="3" height="2" />
      <rect x="10" y="6" width="3" height="2" />
      {/* d-pad */}
      <rect x="3" y="3" width="3" height="1" fill="var(--surface-2, #262019)" />
      <rect x="4" y="2" width="1" height="3" fill="var(--surface-2, #262019)" />
      {/* buttons */}
      <rect x="9" y="2" width="1" height="1" fill="var(--surface-2, #262019)" />
      <rect x="10" y="4" width="1" height="1" fill="var(--surface-2, #262019)" />
    </Sprite>
  );
}

/** Bookmark — the backlog mark. */
export function PixelBookmark(props: SpriteProps) {
  return (
    <Sprite {...props} viewBox="0 0 7 10">
      <rect x="0" y="0" width="7" height="7" />
      <rect x="0" y="7" width="2" height="1" />
      <rect x="5" y="7" width="2" height="1" />
      <rect x="0" y="8" width="1" height="1" />
      <rect x="6" y="8" width="1" height="1" />
    </Sprite>
  );
}

/** Check — completion. Stepped, not a smooth tick. */
export function PixelCheck(props: SpriteProps) {
  return (
    <Sprite {...props} viewBox="0 0 9 8">
      <rect x="0" y="4" width="2" height="2" />
      <rect x="2" y="6" width="2" height="2" />
      <rect x="4" y="4" width="2" height="2" />
      <rect x="5" y="2" width="2" height="2" />
      <rect x="7" y="0" width="2" height="2" />
    </Sprite>
  );
}

/** Cursor — the classic stepped arrow. */
export function PixelCursor(props: SpriteProps) {
  return (
    <Sprite {...props} viewBox="0 0 8 10">
      <rect x="0" y="0" width="1" height="9" />
      <rect x="1" y="1" width="1" height="7" />
      <rect x="2" y="2" width="1" height="6" />
      <rect x="3" y="3" width="1" height="4" />
      <rect x="4" y="4" width="1" height="3" />
      <rect x="5" y="5" width="1" height="2" />
      <rect x="3" y="7" width="2" height="1" />
      <rect x="4" y="8" width="2" height="1" />
    </Sprite>
  );
}

/** Disc — optical media, for the era between cartridges and downloads. */
export function PixelDisc(props: SpriteProps) {
  return (
    <Sprite {...props} viewBox="0 0 11 11">
      <rect x="4" y="0" width="3" height="1" />
      <rect x="2" y="1" width="7" height="1" />
      <rect x="1" y="2" width="9" height="7" />
      <rect x="2" y="9" width="7" height="1" />
      <rect x="4" y="10" width="3" height="1" />
      <rect x="0" y="4" width="1" height="3" />
      <rect x="10" y="4" width="1" height="3" />
      <rect x="4" y="4" width="3" height="3" fill="var(--surface-2, #262019)" />
      <rect x="3" y="3" width="2" height="1" opacity="0.45" />
    </Sprite>
  );
}

/** Speech bubble — reviews and notes. */
export function PixelBubble(props: SpriteProps) {
  return (
    <Sprite {...props} viewBox="0 0 11 9">
      <rect x="1" y="0" width="9" height="1" />
      <rect x="0" y="1" width="11" height="5" />
      <rect x="1" y="6" width="9" height="1" />
      <rect x="2" y="7" width="2" height="1" />
      <rect x="2" y="8" width="1" height="1" />
      <rect x="2" y="2" width="7" height="1" fill="var(--surface-2, #262019)" />
      <rect x="2" y="4" width="4" height="1" fill="var(--surface-2, #262019)" />
    </Sprite>
  );
}

/** A single lit pixel, with its highlight. The set's smallest unit. */
export function PixelDot(props: SpriteProps) {
  return (
    <Sprite {...props} viewBox="0 0 4 4">
      <rect x="0" y="0" width="4" height="4" />
      <rect x="0" y="0" width="1" height="1" fill="#fff" opacity="0.5" />
    </Sprite>
  );
}
