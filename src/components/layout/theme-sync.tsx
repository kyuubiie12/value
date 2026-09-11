"use client";

import * as React from "react";

/**
 * Keeps `<html data-theme|data-accent|data-display-font>` in sync with the saved
 * settings and mirrors them to localStorage so the inline boot script in the
 * root layout can apply them before first paint (no flash on hard reload).
 *
 * `theme` may be "system" — resolved to dark/light from the OS preference here,
 * and kept in sync when the OS switches. The `<html>` attribute is always a
 * concrete "dark" or "light" so the CSS stays simple.
 */
export function ThemeSync({
  theme,
  accent,
  displayFont,
}: {
  theme: string;
  accent: string;
  displayFont: string;
}) {
  React.useEffect(() => {
    const el = document.documentElement;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const apply = () => {
      el.dataset.theme =
        theme === "system" ? (mq.matches ? "light" : "dark") : theme;
    };
    apply();
    el.dataset.accent = accent;
    el.dataset.displayFont = displayFont;
    try {
      localStorage.setItem("vb-theme", theme);
      localStorage.setItem("vb-accent", accent);
      localStorage.setItem("vb-font", displayFont);
    } catch {
      /* private mode / storage disabled — the in-memory attrs still apply */
    }

    if (theme !== "system") return;
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [theme, accent, displayFont]);

  return null;
}
