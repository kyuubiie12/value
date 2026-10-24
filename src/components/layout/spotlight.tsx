"use client";

import * as React from "react";

/**
 * Feeds the pointer position into every `.spot` surface (`--mx` / `--my`) so the
 * hover light in globals.css can follow the mouse. One delegated listener for
 * the whole app; rAF-throttled; ignored for touch.
 */
export function Spotlight() {
  React.useEffect(() => {
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      const el = (e.target as Element | null)?.closest?.(".spot") as HTMLElement | null;
      if (!el) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        el.style.setProperty("--mx", `${e.clientX - r.left}px`);
        el.style.setProperty("--my", `${e.clientY - r.top}px`);
      });
    };
    document.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("pointermove", onMove);
    };
  }, []);
  return null;
}
