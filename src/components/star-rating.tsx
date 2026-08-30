"use client";

import { useState } from "react";

const STAR_PATH =
  "M10 1.5l2.6 5.27 5.82.85-4.21 4.1.99 5.8L10 15.27 4.8 17.5l.99-5.8-4.21-4.1 5.82-.85L10 1.5z";

function StarRow({ color }: { color: string }) {
  return (
    <div className="flex w-max" style={{ color }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <svg
          key={i}
          width="22"
          height="22"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="shrink-0"
        >
          <path d={STAR_PATH} />
        </svg>
      ))}
    </div>
  );
}

type Props = {
  value: number | null;
  onChange?: (value: number) => void;
  readOnly?: boolean;
};

/**
 * 5-star rating with 0.5 increments.
 * Display uses two layered rows (gray base + gold overlay clipped to width),
 * which renders any fraction cleanly. Input uses 10 half-star hit areas plus
 * arrow-key support for accessibility.
 */
export function StarRating({ value, onChange, readOnly = false }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const display = hover ?? value ?? 0;

  return (
    <div
      className="relative inline-flex"
      role={readOnly ? undefined : "slider"}
      aria-valuenow={value ?? 0}
      aria-valuemin={0}
      aria-valuemax={5}
      tabIndex={readOnly ? undefined : 0}
      onKeyDown={(e) => {
        if (readOnly || !onChange) return;
        if (e.key === "ArrowRight" || e.key === "ArrowUp") {
          e.preventDefault();
          onChange(Math.min(5, (value ?? 0) + 0.5));
        } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
          e.preventDefault();
          onChange(Math.max(0.5, (value ?? 0.5) - 0.5));
        }
      }}
    >
      {/* base (empty) */}
      <StarRow color="rgb(212 212 212)" />
      {/* gold overlay clipped to the current value */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ width: `${(display / 5) * 100}%` }}
      >
        <StarRow color="rgb(245 197 24)" />
      </div>

      {/* interactive half-star hit areas */}
      {!readOnly && (
        <div
          className="absolute inset-0 flex"
          onMouseLeave={() => setHover(null)}
        >
          {Array.from({ length: 10 }, (_, i) => {
            const v = (i + 1) * 0.5;
            return (
              <button
                key={v}
                type="button"
                aria-label={`${v} stars`}
                className="h-full flex-1 cursor-pointer"
                onMouseEnter={() => setHover(v)}
                onClick={() => onChange?.(v)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
