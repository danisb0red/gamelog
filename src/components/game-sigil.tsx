import { findReference } from "@/lib/personality";
import type { SigilId } from "@/lib/personality/references";
import {
  PixelAlert,
  PixelBall,
  PixelBlock,
  PixelFlame,
  PixelHeart,
  PixelIris,
  PixelSprout,
  PixelStar,
  PixelTypewriter,
  PixelVault,
} from "./pixel";

/**
 * A tiny pixel mark that appears beside a game's title when that game has a
 * visual motif attached.
 *
 * This is the "reference you see, not read" half of the personality layer. It's
 * ~11px, sits at metadata weight, and is never labelled in the page — the
 * caption lives in a `title` tooltip, so recognising it is entirely on the
 * reader. If you don't know what a bonfire means next to Dark Souls, it reads
 * as a small ornament and costs you nothing.
 *
 * Colour is inherited, so sigils sit in the interface rather than on top of it,
 * with one exception: the bonfire gets the accent and a flicker, because an
 * unlit bonfire isn't a bonfire.
 */
const SIGILS: Record<SigilId, { Icon: typeof PixelFlame; className?: string; size?: number }> = {
  bonfire: { Icon: PixelFlame, className: "ember text-accent", size: 11 },
  heart: { Icon: PixelHeart, className: "text-[#d8595f]", size: 12 },
  ball: { Icon: PixelBall, className: "text-[#d8595f]", size: 12 },
  block: { Icon: PixelBlock, className: "text-[#7cb36a]", size: 11 },
  iris: { Icon: PixelIris, className: "text-[#6fa8dc]", size: 12 },
  alert: { Icon: PixelAlert, className: "text-accent blink", size: 11 },
  typewriter: { Icon: PixelTypewriter, className: "text-neutral-400", size: 13 },
  vault: { Icon: PixelVault, className: "text-[#7cb36a]", size: 12 },
  sprout: { Icon: PixelSprout, className: "text-[#7cb36a]", size: 12 },
  stars: { Icon: PixelStar, className: "text-[#f2b53f]", size: 11 },
  star: { Icon: PixelStar, className: "text-neutral-300", size: 11 },
};

export function GameSigil({
  title,
  className = "",
}: {
  title: string | null | undefined;
  className?: string;
}) {
  if (!title) return null;
  const ref = findReference(title);
  if (!ref?.sigil) return null;

  const spec = SIGILS[ref.sigil];
  if (!spec) return null;
  const { Icon, className: iconClass, size } = spec;

  // Wanted level is the one motif that means something as a *count* — five
  // stars, the way the HUD shows it.
  if (ref.sigil === "stars") {
    return (
      <span
        className={`inline-flex items-center gap-0.5 align-middle ${className}`}
        title={ref.sigilTitle}
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <Icon key={i} size={size} className={iconClass} />
        ))}
      </span>
    );
  }

  return (
    <span className={`inline-flex align-middle ${className}`} title={ref.sigilTitle}>
      <Icon size={size} className={iconClass} />
    </span>
  );
}
