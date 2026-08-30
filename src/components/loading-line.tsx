import { getLoadingMessage, getMessage, hashSeed } from "@/lib/personality";

/**
 * The one place a loading string is rendered.
 *
 * Server-rendered inside `loading.tsx` route files, so the rotating seed is
 * safe here — Next streams this shell once and never re-renders it on the
 * client, so there's no hydration pass to disagree with.
 */
export function LoadingLine({
  /** Optional stable seed; omit to rotate with the clock. */
  seed,
  className = "",
}: {
  seed?: string;
  className?: string;
}) {
  const message = seed ? getLoadingMessage(hashSeed(seed)) : getLoadingMessage();
  return (
    <p className={`text-sm text-neutral-500 ${className}`}>
      {message}
      {/* Three dots that fill in one at a time — the only motion in the
          skeleton, and it reads as a progress cue rather than decoration. */}
      <span className="loading-dots" aria-hidden="true" />
    </p>
  );
}

/** Re-exported so loading routes can pull contextual copy without a second import. */
export { getMessage };
