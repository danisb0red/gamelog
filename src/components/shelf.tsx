import Link from "next/link";
import { PixelCartridge } from "./pixel";

/**
 * A horizontal run of covers standing on a lit edge.
 *
 * The shelf — not the card grid — is the primary layout unit of the redesign.
 * It scrolls, it snaps, it has a physical edge beneath it, and it lets artwork
 * run past the fold, which implies a collection continuing off-screen rather
 * than a finite widget of results.
 */
export function Shelf({
  label,
  title,
  action,
  children,
  count,
}: {
  /** Optional small mono marker above the title. Omit it when the title says
   *  the same thing — a kicker that repeats its heading is just noise. */
  label?: string;
  title?: string;
  action?: { href: string; text: string };
  children: React.ReactNode;
  /** Optional item count, rendered as data beside the title. */
  count?: number;
}) {
  return (
    <section className="py-8">
      <div className="mb-4 flex items-end justify-between gap-4 px-1">
        <div>
          {label && <span className="hud-label">{label}</span>}
          {title && (
            <h2 className="font-display text-2xl font-semibold tracking-tight text-neutral-100">
              {title}
              {count !== undefined && (
                <span className="ml-2.5 font-mono text-sm font-normal text-neutral-500">
                  {String(count).padStart(2, "0")}
                </span>
              )}
            </h2>
          )}
        </div>
        {action && (
          <Link
            href={action.href}
            className="shrink-0 font-mono text-[11px] uppercase tracking-[0.15em] text-neutral-500 transition-colors hover:text-accent"
          >
            {action.text} →
          </Link>
        )}
      </div>

      <div className="shelf">{children}</div>
      <div className="shelf-edge" />

    </section>
  );
}

/**
 * The empty shelf.
 *
 * Drawn, not written: three ghost slots at cover proportions sitting on the
 * same edge a real shelf uses. The point is that emptiness looks *designed* and
 * clearly shaped like the thing that's missing — you can see where games go.
 */
export function EmptyShelf({
  message,
  hint,
  slots = 3,
  action,
}: {
  message: string;
  hint?: string;
  slots?: number;
  /** The obvious next step, as a button. */
  action?: { href: string; label: string };
}) {
  return (
    // `w-full` is load-bearing. Inside a <Shelf> this is a child of `.shelf`,
    // where every child is `flex: none` — so it sized itself to its content,
    // ran off the right edge of a phone, and "Nothing in progress. Set a game
    // to Playing…" was cut off mid-word. Pinned to the row's width, the content
    // wraps instead; below `sm` the ghost covers sit above the text rather than
    // beside it.
    <div className="flex w-full flex-col gap-4 py-2 sm:flex-row sm:items-end sm:gap-5">
      <div className="flex gap-3 sm:gap-4" aria-hidden="true">
        {Array.from({ length: slots }).map((_, i) => (
          <div
            key={i}
            className="flex aspect-[3/4] w-[64px] items-center justify-center rounded-[3px] border border-dashed border-neutral-700/70 sm:w-[76px]"
            style={{ opacity: 1 - i * 0.26 }}
          >
            {/* A ghost cartridge in the first slot — the empty shelf shows what
                belongs there without a word of instruction. */}
            {i === 0 && <PixelCartridge size={15} className="text-neutral-700" />}
          </div>
        ))}
      </div>
      <div className="min-w-0 sm:pb-2">
        <p className="font-display text-base text-neutral-300">{message}</p>
        {hint && <p className="mt-1 font-mono text-[11px] text-neutral-500">{hint}</p>}
        {action && (
          <Link
            href={action.href}
            className="px-cut mt-4 inline-flex min-h-11 items-center bg-accent px-5 font-mono text-[11px] uppercase tracking-[0.15em] text-accent-foreground transition hover:brightness-110"
          >
            {action.label}
          </Link>
        )}
      </div>
    </div>
  );
}
