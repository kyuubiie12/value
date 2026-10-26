"use client";

import * as React from "react";

/**
 * Cards fade up as they scroll into view. Anything marked `data-reveal` that starts
 * below the fold is held back until it gets near the viewport, and cards added later
 * (a filter, "Vis flere", another page) are picked up too. Cards already on screen
 * are left alone. Does nothing when the user prefers reduced motion.
 */
export function ScrollReveal() {
  React.useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!("IntersectionObserver" in window)) return;

    const io = new IntersectionObserver(
      (entries) => {
        let n = 0;
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const el = e.target as HTMLElement;
          io.unobserve(el);
          el.style.setProperty("--rd", `${Math.min(n++, 5) * 55}ms`);
          el.dataset.revealState = "shown";
        }
      },
      { threshold: 0.06, rootMargin: "0px 0px -4% 0px" },
    );

    const prepare = (el: HTMLElement) => {
      const state = el.dataset.revealState;
      if (state === "shown" || state === "seen") return;
      if (state !== "hidden") {
        const r = el.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) {
          el.dataset.revealState = "seen"; // on screen from the start: leave it alone
          return;
        }
        el.dataset.revealState = "hidden";
      }
      io.observe(el); // (re)attach — the effect can run twice in development
    };

    const scan = (root: ParentNode) => {
      if (root instanceof HTMLElement && root.matches("[data-reveal]")) prepare(root);
      root.querySelectorAll<HTMLElement>("[data-reveal]").forEach(prepare);
    };

    scan(document);
    const mo = new MutationObserver((muts) => {
      for (const m of muts) m.addedNodes.forEach((node) => node instanceof HTMLElement && scan(node));
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, []);

  return null;
}
