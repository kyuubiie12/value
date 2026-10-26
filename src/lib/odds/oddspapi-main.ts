import type { BookOdds } from "./detect";
import { BET } from "./config";

/**
 * OddsPapi → the `BookOdds` shape the value detector already reads
 * (book → bet id → outcome label → decimal odds). Pure.
 *
 * Only the full-time markets the detector prices are translated: 1X2, draw no
 * bet, double chance, Asian handicap, goals over/under, team totals and corners
 * over/under. Everything keeps the old labels ("Home", "Over 2.5", "Home -1.5")
 * so `detect.ts` doesn't change.
 */

/** OddsPapi bookmaker slug → app bookmaker id (Pinnacle is the sharp reference). */
export const ODDSPAPI_BOOKS: Record<string, string> = {
  pinnacle: "pinnacle",
  bet365: "bet365",
  betano: "betano",
  "betinia.dk": "betinia",
  leovegas: "leovegas",
  "unibet.dk": "unibet",
  "bwin.dk": "bwin",
  "888sport.dk": "888sport",
};

/** Compact dictionary of the main markets, kept in the database. */
export interface MainMarket {
  /** OddsPapi marketType, e.g. "totals", "spreads". */
  t: string;
  /** Line (handicap), 0 when the market has none. */
  h: number;
  /** outcomeId → outcome name. */
  o: Record<string, string>;
}
export type MainMarkets = Record<string, MainMarket>;

const WANTED_TYPES = new Set([
  "1x2",
  "drawnobet",
  "doublechance",
  "spreads",
  "totals",
  "teamtotals-team1",
  "teamtotals-team2",
  "totals-corners",
]);

/** Which market types we keep from `/markets` (full-time, not player props). */
export function isMainMarket(m: { marketType: string; period: string; playerProp: boolean }): boolean {
  return !m.playerProp && m.period === "fulltime" && WANTED_TYPES.has(m.marketType);
}

export interface RawMainOutcome {
  outcomeId: number;
  marketId: number;
  price: number;
  active?: boolean;
  changedAt?: number;
  marketActive?: boolean;
  playerId?: number;
}
export type RawMainOdds = Record<string, Record<string, RawMainOutcome>>;

const DC: Record<string, string> = { "1X": "Home/Draw", "12": "Home/Away", "2X": "Draw/Away", X2: "Draw/Away" };
const SIDE: Record<string, string> = { "1": "Home", X: "Draw", "2": "Away" };

/** The label + bet id an outcome gets in the old format, or null when we don't use it. */
function translate(m: MainMarket, outcome: string): { bet: string; label: string } | null {
  const line = m.h;
  switch (m.t) {
    case "1x2":
      return SIDE[outcome] ? { bet: BET.matchWinner, label: SIDE[outcome] } : null;
    case "drawnobet":
      return outcome === "1" || outcome === "2" ? { bet: BET.homeAway, label: SIDE[outcome] } : null;
    case "doublechance":
      return DC[outcome] ? { bet: BET.doubleChance, label: DC[outcome] } : null;
    case "spreads":
      // Both sides carry the home handicap, as API-Football labelled them.
      return outcome === "1" || outcome === "2" ? { bet: BET.asianHandicap, label: `${SIDE[outcome]} ${line}` } : null;
    case "totals":
      return outcome === "Over" || outcome === "Under" ? { bet: BET.goalsOverUnder, label: `${outcome} ${line}` } : null;
    case "teamtotals-team1":
      return outcome === "Over" || outcome === "Under" ? { bet: BET.homeTotal, label: `${outcome} ${line}` } : null;
    case "teamtotals-team2":
      return outcome === "Over" || outcome === "Under" ? { bet: BET.awayTotal, label: `${outcome} ${line}` } : null;
    case "totals-corners":
      return outcome === "Over" || outcome === "Under" ? { bet: BET.cornersOverUnder, label: `${outcome} ${line}` } : null;
    default:
      return null;
  }
}

export function toBookOdds(raw: RawMainOdds, markets: MainMarkets): BookOdds {
  const out: BookOdds = {};
  for (const [slug, outcomes] of Object.entries(raw)) {
    const book = ODDSPAPI_BOOKS[slug];
    if (!book) continue;
    for (const o of Object.values(outcomes)) {
      if (o.active === false || o.playerId || !(o.price > 1)) continue;
      const m = markets[String(o.marketId)];
      if (!m) continue;
      const t = translate(m, m.o[String(o.outcomeId)] ?? "");
      if (!t) continue;
      ((out[book] ??= {})[t.bet] ??= {})[t.label] = o.price;
    }
  }
  return out;
}
