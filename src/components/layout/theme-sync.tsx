"use client";

import * as React from "react";
import { applyAppearance, type AppearanceValues } from "@/lib/appearance";

/**
 * Keeps `<html data-*>` in sync with the saved appearance settings and mirrors
 * them to localStorage so the inline boot script in the root layout can apply
 * them before first paint (no flash on hard reload).
 *
 * `theme` may be "system" — resolved to dark/light from the OS preference by
 * `applyAppearance`, and kept in sync here when the OS switches. The `<html>`
 * attribute is always a concrete "dark" or "light" so the CSS stays simple.
 */
export function ThemeSync(props: AppearanceValues) {
  const { theme, accent, displayFont, surface, corners, glow, animations } = props;

  React.useEffect(() => {
    applyAppearance(
      { theme, accent, displayFont, surface, corners, glow, animations },
      { persist: true },
    );

    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => applyAppearance({ theme: "system" });
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme, accent, displayFont, surface, corners, glow, animations]);

  return null;
}
