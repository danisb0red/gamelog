"use client";

import { useEffect, useState } from "react";
import { PixelCartridge, PixelHeart } from "./pixel";

/**
 * The site's hidden mark.
 *
 * A tiny cartridge sits at the very bottom of every page at 25% opacity — small
 * and quiet enough to be scenery. Hovering brightens it. Clicking it three times
 * flips it to a beating pixel heart, and that's the entire payoff: no toast, no
 * caption, no "SECRET FOUND" plate. If the site announced this it would stop
 * being a discovery and start being a feature.
 *
 * Rules it obeys: changes no layout, blocks nothing, resets itself, and stays
 * hidden from assistive tech.
 */
export function HiddenMark() {
  const [clicks, setClicks] = useState(0);
  const revealed = clicks >= 3;

  useEffect(() => {
    if (!revealed) return;
    const t = setTimeout(() => setClicks(0), 4200);
    return () => clearTimeout(t);
  }, [revealed]);

  return (
    <div className="pointer-events-none relative z-[2] flex justify-center pb-10 pt-4">
      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        onClick={() => setClicks((c) => c + 1)}
        className="pointer-events-auto opacity-25 transition-opacity duration-300 hover:opacity-70"
      >
        {revealed ? (
          <PixelHeart size={12} className="ember text-accent" />
        ) : (
          <PixelCartridge size={11} className="text-neutral-500" />
        )}
      </button>
    </div>
  );
}
