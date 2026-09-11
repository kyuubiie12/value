import type { UserSettings } from "@/types";

export const DEFAULT_SETTINGS: UserSettings = {
  displayName: "Viktor B.",
  email: "viktorbuhl@outlook.com",
  currency: "DKK",
  timezone: "Europe/Copenhagen",
  displayFont: "grotesk",
  theme: "dark",
  accent: "emerald",
  memberSince: "2026-04-02T00:00:00.000Z",
  plan: "pro",
  onboardingComplete: true,

  startingBankroll: 10_000,
  unitSize: 100,
  unitMode: "fixed",
  defaultStakeUnits: 1,
  kellyFraction: 0.25,
  stakeRounding: 10,

  minEdge: 0.02,
  activeBookmakerIds: ["bet365", "unibet", "danske-spil", "betano", "leovegas", "nordicbet"],
  favoriteLeagueIds: ["eng-pl", "den-superliga", "uefa-ucl", "esp-laliga"],

  autoFollow: false,
  autoFollowMinEdge: 0.05,

  weeklyStakeLimit: 0,
  sessionReminderHours: 0,

  valueAlerts: true,
  alertMinEdge: 0.04,
  priceMoveAlerts: true,
  betResultAlerts: true,
  weeklyReport: true,
};
