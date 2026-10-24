import type {
  AccentColor,
  CornerStyle,
  DisplayFont,
  GlowLevel,
  SurfaceTone,
  ThemeMode,
} from "@/types";

/**
 * Single source of truth for everything the "Udseende" settings can change:
 * the option lists (labels, swatches), the allowed values (used to validate on
 * the server) and `applyAppearance`, which writes the `data-*` attributes on
 * `<html>` that `globals.css` keys off. Client-safe — no server imports.
 */

export interface AppearanceValues {
  theme: ThemeMode;
  accent: AccentColor;
  displayFont: DisplayFont;
  surface: SurfaceTone;
  corners: CornerStyle;
  glow: GlowLevel;
  animations: boolean;
}

export const APPEARANCE_DEFAULTS: AppearanceValues = {
  theme: "dark",
  accent: "emerald",
  displayFont: "grotesk",
  surface: "midnight",
  corners: "round",
  glow: "subtle",
  animations: true,
};

export const THEME_VALUES: ThemeMode[] = ["dark", "light", "system"];
export const ACCENT_VALUES: AccentColor[] = [
  "emerald",
  "blue",
  "violet",
  "amber",
  "rose",
  "coral",
  "lime",
  "silver",
];
export const FONT_VALUES: DisplayFont[] = [
  "grotesk",
  "oswald",
  "teko",
  "rajdhani",
  "anton",
];
export const SURFACE_VALUES: SurfaceTone[] = ["midnight", "graphite", "ink"];
export const CORNER_VALUES: CornerStyle[] = ["sharp", "round", "soft"];
export const GLOW_VALUES: GlowLevel[] = ["off", "subtle", "strong"];

/** Swatches for the picker — same hues as the dark-theme accents in globals.css. */
export const ACCENT_OPTIONS: {
  value: AccentColor;
  label: string;
  dot: string;
  strong: string;
}[] = [
  { value: "emerald", label: "Smaragd", dot: "#1fce90", strong: "#4ee7b0" },
  { value: "blue", label: "Blå", dot: "#4098f5", strong: "#74b4fb" },
  { value: "violet", label: "Violet", dot: "#9a7bf0", strong: "#b7a1ff" },
  { value: "amber", label: "Rav", dot: "#eaa93c", strong: "#ffc667" },
  { value: "rose", label: "Rosa", dot: "#f0668f", strong: "#ff93b3" },
  { value: "coral", label: "Koral", dot: "#f47f57", strong: "#ffa583" },
  { value: "lime", label: "Lime", dot: "#a6d62f", strong: "#c6f05a" },
  { value: "silver", label: "Sølv", dot: "#c3cad6", strong: "#e6eaf1" },
];

export const SURFACE_OPTIONS: {
  value: SurfaceTone;
  label: string;
  desc: string;
  /** [page, card, raised] — for the thumbnail only. */
  swatch: [string, string, string];
}[] = [
  {
    value: "midnight",
    label: "Midnat",
    desc: "Kold blå-sort. Standard.",
    swatch: ["#090b11", "#151b28", "#252d3d"],
  },
  {
    value: "graphite",
    label: "Grafit",
    desc: "Neutral mørkegrå — mindre farve.",
    swatch: ["#0d0e10", "#17191d", "#2a2d33"],
  },
  {
    value: "ink",
    label: "Blæk",
    desc: "Dybest sort, god til OLED.",
    swatch: ["#030407", "#0c0f15", "#1a1f2a"],
  },
];

export const CORNER_OPTIONS: { value: CornerStyle; label: string; r: number }[] = [
  { value: "sharp", label: "Skarpe", r: 3 },
  { value: "round", label: "Afrundede", r: 9 },
  { value: "soft", label: "Bløde", r: 15 },
];

export const GLOW_OPTIONS: { value: GlowLevel; label: string; desc: string }[] = [
  { value: "off", label: "Fra", desc: "Ingen lys-effekter" },
  { value: "subtle", label: "Subtil", desc: "Et blidt lys under musen" },
  { value: "strong", label: "Kraftig", desc: "Tydeligt lys og kant" },
];

const KEY = {
  theme: "vb-theme",
  accent: "vb-accent",
  displayFont: "vb-font",
  surface: "vb-surface",
  corners: "vb-corners",
  glow: "vb-glow",
  animations: "vb-anim",
} as const;

const oneOf = <T extends string>(list: readonly T[], v: unknown, fallback: T): T =>
  list.includes(v as T) ? (v as T) : fallback;

/** Coerce anything (a stored value, a client payload) into valid appearance values. */
export function sanitizeAppearance(
  input: Partial<Record<keyof AppearanceValues, unknown>>,
): AppearanceValues {
  return {
    theme: oneOf(THEME_VALUES, input.theme, APPEARANCE_DEFAULTS.theme),
    accent: oneOf(ACCENT_VALUES, input.accent, APPEARANCE_DEFAULTS.accent),
    displayFont: oneOf(FONT_VALUES, input.displayFont, APPEARANCE_DEFAULTS.displayFont),
    surface: oneOf(SURFACE_VALUES, input.surface, APPEARANCE_DEFAULTS.surface),
    corners: oneOf(CORNER_VALUES, input.corners, APPEARANCE_DEFAULTS.corners),
    glow: oneOf(GLOW_VALUES, input.glow, APPEARANCE_DEFAULTS.glow),
    animations:
      typeof input.animations === "boolean"
        ? input.animations
        : APPEARANCE_DEFAULTS.animations,
  };
}

const resolveTheme = (theme: ThemeMode): "dark" | "light" =>
  theme === "system"
    ? window.matchMedia("(prefers-color-scheme: light)").matches
      ? "light"
      : "dark"
    : theme;

/**
 * Write appearance to `<html>` (live preview and the post-save sync). Pass only
 * what changed — untouched attributes are left alone. `persist` also mirrors to
 * localStorage so the inline boot script can restore it before first paint.
 */
export function applyAppearance(
  patch: Partial<AppearanceValues>,
  { persist = false }: { persist?: boolean } = {},
) {
  const el = document.documentElement;
  if (patch.theme !== undefined) el.dataset.theme = resolveTheme(patch.theme);
  if (patch.accent !== undefined) el.dataset.accent = patch.accent;
  if (patch.displayFont !== undefined) el.dataset.displayFont = patch.displayFont;
  if (patch.surface !== undefined) el.dataset.surface = patch.surface;
  if (patch.corners !== undefined) el.dataset.corners = patch.corners;
  if (patch.glow !== undefined) el.dataset.glow = patch.glow;
  if (patch.animations !== undefined) {
    el.dataset.motion = patch.animations ? "on" : "off";
  }
  if (!persist) return;
  try {
    for (const [k, v] of Object.entries(patch)) {
      localStorage.setItem(KEY[k as keyof AppearanceValues], String(v));
    }
  } catch {
    /* private mode / storage disabled — the in-memory attrs still apply */
  }
}
