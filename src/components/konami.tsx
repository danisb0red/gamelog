"use client";

import { useEffect, useState } from "react";

/**
 * ↑ ↑ ↓ ↓ ← → ← → B A
 *
 * The reward is a slow colour sweep across the page and nothing else — no
 * words, no plate. If you entered this you already know what you did.
 *
 * Constraints this respects:
 *  - never fires while you're typing (arrow keys belong to the input)
 *  - changes no layout, so it cannot break a page mid-use
 *  - self-clears, and honours prefers-reduced-motion via CSS
 */
const SEQUENCE = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "b",
  "a",
] as const;

export function Konami() {
  const [triggered, setTriggered] = useState(false);

  useEffect(() => {
    let index = 0;

    function onKey(e: KeyboardEvent) {
      // Typing takes precedence — arrow keys are navigation inside a field.
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el?.isContentEditable) {
        index = 0;
        return;
      }

      const expected = SEQUENCE[index];
      const key = expected.length === 1 ? e.key.toLowerCase() : e.key;

      if (key === expected) {
        index++;
        if (index === SEQUENCE.length) {
          index = 0;
          setTriggered(true);
        }
      } else {
        // Allow a wrong key to be the start of a fresh attempt.
        index = e.key === SEQUENCE[0] ? 1 : 0;
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!triggered) return;
    const root = document.documentElement;
    root.classList.add("konami-active");
    const timer = setTimeout(() => {
      root.classList.remove("konami-active");
      setTriggered(false);
    }, 2400);
    return () => {
      clearTimeout(timer);
      root.classList.remove("konami-active");
    };
  }, [triggered]);

  // No toast, no words. Finding this is the reward; announcing it with an
  // ACHIEVEMENT UNLOCKED plate would be the site congratulating itself.
  return null;
}
