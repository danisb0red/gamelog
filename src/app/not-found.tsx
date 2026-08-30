import Link from "next/link";
import { PixelHeart } from "@/components/pixel";

/**
 * 404.
 *
 * This was briefly a full GAME OVER screen with CONTINUE? and INSERT COIN.
 * That's the interface doing a bit at the exact moment someone is lost, which
 * is the wrong time to be clever. Now it says what happened and offers the way
 * back — and the only reference left is three small hearts with the last one
 * empty, which reads as an ornament unless you already know what it means.
 */
export default function NotFound() {
  return (
    <main className="relative flex flex-1 flex-col items-center justify-center px-5 py-28 text-center">
      <div className="flex items-center gap-1.5" aria-hidden="true">
        <PixelHeart size={14} className="text-accent" />
        <PixelHeart size={14} className="text-accent" />
        <PixelHeart size={14} className="text-neutral-800" />
      </div>

      <h1 className="mt-8 font-display text-3xl font-bold tracking-tight text-neutral-100 sm:text-4xl">
        Page not found
      </h1>

      <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-neutral-400">
        That page isn&apos;t here. It may have moved, or never existed.
      </p>

      <Link
        href="/"
        className="px-cut mt-9 inline-block bg-accent px-5 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-accent-foreground transition hover:brightness-110"
      >
        Back home
      </Link>
    </main>
  );
}
