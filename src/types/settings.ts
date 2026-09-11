import type { Currency } from "./common";

export type UnitMode = "fixed" | "percentage";

/** The display face that drives headings, match names and big numbers. */
export type DisplayFont = "grotesk" | "oswald" | "teko" | "rajdhani" | "anton";

export type ThemeMode = "dark" | "light" | "system";
export type AccentColor = "emerald" | "blue" | "violet" | "amber";

/** User preferences that shape the feed and the tracker. */
export interface UserSettings {
  displayName: string;
  email: string;
  currency: Currency;
  timezone: string;
  /** Chosen display typeface — see `DisplayFont`. */
  displayFont: DisplayFont;
  /** Dark or light UI. */
  theme: ThemeMode;
  /** Accent colour. */
  accent: AccentColor;
  /** When the account was created — read-only, shown on the profile. */
  memberSince: string; // ISO
  /** Subscription tier. */
  plan: "free" | "pro";
  /** False until the new user finishes the welcome wizard. */
  onboardingComplete: boolean;

  /** Bankroll management. */
  startingBankroll: number;
  /** 1 unit = this many currency units (fixed) or this % of bankroll (percentage). */
  unitSize: number;
  unitMode: UnitMode;
  defaultStakeUnits: number;
  /** Kelly multiplier applied to suggestions, e.g. 0.25 = quarter Kelly. */
  kellyFraction: number;
  /** Recommended stakes are rounded to the nearest multiple of this (currency). */
  stakeRounding: number;

  /** Feed defaults. */
  minEdge: number; // fraction — value bets below this EV are hidden from the feed
  activeBookmakerIds: string[];
  favoriteLeagueIds: string[];

  /** Auto-log every value bet above `autoFollowMinEdge` to the portfolio. */
  autoFollow: boolean;
  autoFollowMinEdge: number; // fraction

  /** Responsible gambling — 0 disables the limit. */
  weeklyStakeLimit: number; // currency
  sessionReminderHours: number;

  /** Notifications — the user ticks off exactly what they want to hear about. */
  valueAlerts: boolean;
  /** Value alerts below this EV don't notify. */
  alertMinEdge: number; // fraction
  priceMoveAlerts: boolean;
  betResultAlerts: boolean;
  weeklyReport: boolean;
}
