"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

/**
 * The dimmed backdrop a sheet or dialog sits on.
 *
 * Portalled to <body> rather than rendered in place, and that is the whole
 * point of this component. The layout wraps every page in `relative z-[2]` (it
 * has to clear the fixed grain overlay at z-1), which makes that wrapper a
 * stacking context — so a modal rendered inside it competes at z-2 no matter
 * how high its own z-index is, and the tab bar, a sibling at z-50, painted
 * straight over the sheet's submit button. Escaping to <body> puts the sheet in
 * the root stacking context where its z-index means what it says.
 *
 * Also takes care of the two things every sheet needs and none of them had:
 * Escape closes it, and the page behind stops scrolling while it is open.
 */
export function SheetOverlay({
  open,
  onClose,
  className = "",
  children,
}: {
  open: boolean;
  /** Called on backdrop click and on Escape. Omit to make the sheet insistent. */
  onClose?: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);

    // Without this the page scrolls under the sheet on touch, which reads as
    // two things moving at once.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  // `open` is false on the server, so createPortal never runs during SSR.
  if (!open) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      onClick={() => onClose?.()}
      className={`fixed inset-0 z-[60] flex items-end justify-center bg-black/60 backdrop-blur-[2px] sm:items-start sm:p-4 ${className}`}
    >
      {children}
    </div>,
    document.body,
  );
}

/** The grab handle. Phones only — above `sm` a sheet is an ordinary dialog. */
export function SheetGrip() {
  return (
    <div className="mb-4 flex justify-center sm:hidden">
      <span className="sheet-grip" aria-hidden="true" />
    </div>
  );
}
