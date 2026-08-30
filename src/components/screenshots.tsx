"use client";

import { useEffect, useState } from "react";

/** Screenshot strip with a click-to-expand lightbox (arrow keys + esc). */
export function Screenshots({ images }: { images: string[] }) {
  const [index, setIndex] = useState<number | null>(null);

  const close = () => setIndex(null);
  const next = () => setIndex((i) => (i === null ? i : (i + 1) % images.length));
  const prev = () =>
    setIndex((i) => (i === null ? i : (i - 1 + images.length) % images.length));

  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, images.length]);

  if (images.length === 0) return null;

  return (
    <>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {images.map((src, i) => (
          <button
            key={src}
            type="button"
            onClick={() => setIndex(i)}
            className="shrink-0 overflow-hidden rounded-lg transition hover:opacity-80"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" className="h-40 cursor-pointer object-cover" />
          </button>
        ))}
      </div>

      {index !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={close}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={images[index]}
            alt=""
            className="max-h-[88vh] max-w-[92vw] rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Close — pinned to the viewport top-right */}
          <button
            type="button"
            onClick={close}
            style={{ position: "fixed", top: 16, right: 16 }}
            className="z-[60] rounded-full bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20"
          >
            Close ✕
          </button>

          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  prev();
                }}
                style={{ position: "fixed", top: "50%", left: 16, transform: "translateY(-50%)" }}
                className="z-[60] flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-3xl leading-none text-white hover:bg-white/20"
                aria-label="Previous"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  next();
                }}
                style={{ position: "fixed", top: "50%", right: 16, transform: "translateY(-50%)" }}
                className="z-[60] flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-3xl leading-none text-white hover:bg-white/20"
                aria-label="Next"
              >
                ›
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}
