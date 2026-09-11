/** Shared primitive domain types. ValueBet AI is football-only. */

export type MarketType =
  | "1x2"
  | "double-chance"
  | "draw-no-bet"
  | "over-under"
  | "btts"
  | "asian-handicap"
  | "team-total"
  | "corners"
  | "cards"
  | "ht-ft"
  | "correct-score";

export type BetStatus =
  | "pending"
  | "won"
  | "lost"
  | "void"
  | "cashout"
  | "half-won"
  | "half-lost";

export type Currency = "DKK" | "EUR" | "USD";

export type Confidence = "low" | "medium" | "high";

/** A single result in a form guide, most-recent last. */
export type FormResult = "W" | "D" | "L";

/** Direction the best available price has moved since detection. */
export type PriceMovement = "shortening" | "drifting" | "stable";

export interface DateRange {
  from?: string; // ISO date
  to?: string; // ISO date
}

export const MARKET_LABELS: Record<MarketType, string> = {
  "1x2": "1X2",
  "double-chance": "Dobbeltchance",
  "draw-no-bet": "Draw No Bet",
  "over-under": "Mål over/under",
  btts: "Begge hold scorer",
  "asian-handicap": "Asiatisk handicap",
  "team-total": "Holdmål",
  corners: "Hjørnespark",
  cards: "Kort",
  "ht-ft": "Pause / fuldtid",
  "correct-score": "Korrekt resultat",
};

export const MARKET_GROUPS: Record<string, MarketType[]> = {
  "Kampresultat": ["1x2", "double-chance", "draw-no-bet"],
  "Mål": ["over-under", "btts", "team-total", "correct-score"],
  "Handicap & specials": ["asian-handicap", "corners", "cards", "ht-ft"],
};

export const BET_STATUS_LABELS: Record<BetStatus, string> = {
  pending: "Afventer",
  won: "Vundet",
  lost: "Tabt",
  void: "Annulleret",
  cashout: "Cashout",
  "half-won": "Halvt vundet",
  "half-lost": "Halvt tabt",
};

export const PRICE_MOVEMENT_LABELS: Record<PriceMovement, string> = {
  shortening: "Odds falder",
  drifting: "Odds stiger",
  stable: "Stabil",
};
