import type { UserSettings } from "@/types";

/** Compact, serialisable view of today's value bets — what the settings tabs need to show live consequences. */
export interface FeedPulse {
  id: string;
  leagueId: string;
  event: string;
  /** Expected value as a fraction (0.05 = +5 %). */
  ev: number;
  /** Full-Kelly stake as a fraction of bankroll. */
  kelly: number;
  /** Best decimal odds. */
  odds: number;
  bestBookmakerId: string;
  /** Every bookmaker that prices this selection. */
  quotedBy: string[];
}

export type SetSetting = <K extends keyof UserSettings>(
  key: K,
  value: UserSettings[K],
) => void;
