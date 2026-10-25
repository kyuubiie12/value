import type { Confidence, MarketType, OddsQuote, PlayerStatContext, ValueOpportunity } from "@/types";
import { expectedValue, kellyStake } from "@/lib/betting-math";
import { LEAGUE_MAP } from "@/lib/mock-data/leagues";
import { lineFromLabel } from "./player-model";

/**
 * Player-prop candidates from OddsPapi. There is no sharp book for these
 * markets, so nothing here is called value on its own: every prop is checked
 * against what the player actually did in his last matches (`history-model`),
 * and only those his record proves are shown. Pure: no I/O.
 */

/** OddsPapi bookmaker slug → app bookmaker id. Only these are requested. */
export const NICHE_BOOKS: Record<string, string> = {
  bet365: "bet365",
  betano: "betano",
  "bwin.dk": "bwin",
  "betinia.dk": "betinia",
  leovegas: "leovegas",
  "unibet.dk": "unibet",
  "888sport.dk": "888sport",
};

export type NicheCategory = "shots" | "shots-on-target" | "tackles" | "fouls" | "saves" | "cards";

const CATEGORY_MARKET: Record<NicheCategory, MarketType> = {
  shots: "shots",
  "shots-on-target": "shots-on-target",
  tackles: "tackles",
  fouls: "fouls",
  saves: "saves",
  cards: "cards",
};

const CATEGORY_LABEL: Record<NicheCategory, string> = {
  shots: "Spiller-skud",
  "shots-on-target": "Spiller-skud på mål",
  tackles: "Spiller-tacklinger",
  fouls: "Spiller-fouls",
  saves: "Målmandsredninger",
  cards: "Spiller-kort",
};

const CATEGORY_NOUN: Record<NicheCategory, string> = {
  shots: "skud",
  "shots-on-target": "skud på mål",
  tackles: "tacklinger",
  fouls: "fouls",
  saves: "redninger",
  cards: "kort",
};

const BOOK_NAME: Record<string, string> = {
  bet365: "Bet365",
  betano: "Betano",
  bwin: "Bwin",
  betinia: "Betinia",
  leovegas: "LeoVegas",
  unibet: "Unibet",
  "888sport": "888sport",
};

/** Compact market dictionary kept in the database (outcome id → label). */
export interface NicheMarket {
  c: NicheCategory;
  n: string;
  o: Record<string, string>;
  /** The line of an over/under market (0.5, 1.5 …); 0 for ladders ("1+", "2+"). */
  h?: number;
}
export type NicheMarkets = Record<string, NicheMarket>;

/** Which of our categories (if any) a provider market belongs to. */
export function categoryOf(name: string, playerProp: boolean): NicheCategory | null {
  if (!playerProp) return null;
  if (/tackle/i.test(name)) return "tackles";
  if (/shots?\s+on\s+(goal|target)/i.test(name)) return "shots-on-target";
  if (/shot/i.test(name)) return "shots";
  if (/save/i.test(name)) return "saves";
  if (/carded|booked|card/i.test(name)) return "cards";
  if (/foul/i.test(name)) return "fouls";
  return null;
}

export interface RawNicheOutcome {
  outcomeId: number;
  playerId: number;
  price: number;
  active?: boolean;
  marketId: number;
}

/** book slug → outcome key → outcome, as returned by `/fixtures/odds`. */
export type RawNicheOdds = Record<string, Record<string, RawNicheOutcome>>;

export interface NicheFixture {
  fixtureId: string;
  leagueId: string;
  startsAt: string;
  homeTeam: string;
  awayTeam: string;
  /** Team ids (OddsPapi participant = SportAPI team), when known. */
  homeId?: number | null;
  awayId?: number | null;
}

/** Odds outside this window are mostly rung-noise (very short or long-shot ladder steps). */
const MIN_PRICE = 1.3;
const MAX_PRICE = 5.5;
/** Ceiling on the full-Kelly stake (fraction of bankroll) for player props. */
const MAX_KELLY = 0.04;

const dk = (n: number) => n.toFixed(2).replace(".", ",");

/** A priced prop waiting to be checked against the player's own matches. */
export interface NicheCandidate {
  id: string;
  fixture: NicheFixture;
  playerId: number;
  category: NicheCategory;
  /** The line, e.g. "2+" — combined with the player name once names are resolved. */
  outcomeLabel: string;
  noun: string;
  bestOdds: number;
  bestBookmakerId: string;
  quotes: OddsQuote[];
  at: string;
}

interface Group {
  category: NicheCategory;
  playerId: number;
  /** The count that wins the bet: 2 means "2+". */
  line: number;
  prices: Map<string, number>;
}

/** "2+" → 2, "Yes" → 1, and "Over" on a 1.5 line → 2; anything else can't be compared. */
function lineOf(m: NicheMarket, outcome: string | undefined): number | null {
  if (!outcome) return null;
  const ladder = lineFromLabel(outcome);
  if (ladder !== null) return ladder;
  if (/^over$/i.test(outcome) && m.h && !Number.isInteger(m.h)) return Math.floor(m.h) + 1;
  return null;
}

/** Every "N+" player prop our Danish books price, at its best price. No judgement yet. */
export function listPropCandidates(
  fx: NicheFixture,
  odds: RawNicheOdds,
  markets: NicheMarkets,
  at: string,
): NicheCandidate[] {
  const groups = new Map<string, Group>();
  for (const [slug, outcomes] of Object.entries(odds)) {
    if (!NICHE_BOOKS[slug]) continue;
    for (const o of Object.values(outcomes)) {
      if (o.active === false || !o.playerId || !(o.price > 1)) continue;
      const m = markets[String(o.marketId)];
      if (!m) continue;
      const line = lineOf(m, m.o[String(o.outcomeId)]);
      if (line === null) continue;
      const key = `${m.c}|${o.playerId}|${line}`;
      let g = groups.get(key);
      if (!g) {
        g = { category: m.c, playerId: o.playerId, line, prices: new Map() };
        groups.set(key, g);
      }
      // The same book can quote a line twice (ladder + over/under): keep its better price.
      g.prices.set(slug, Math.max(g.prices.get(slug) ?? 0, o.price));
    }
  }

  const out: NicheCandidate[] = [];
  for (const g of groups.values()) {
    const label = g.category === "cards" && g.line === 1 ? "Yes" : `${g.line}+`;
    let bestSlug = "";
    let best = 0;
    for (const [slug, p] of g.prices) {
      if (p > best) {
        best = p;
        bestSlug = slug;
      }
    }
    if (best < MIN_PRICE || best > MAX_PRICE) continue;
    out.push({
      id: `np_${fx.fixtureId}_${g.category}_${g.playerId}_${g.line}`,
      fixture: fx,
      playerId: g.playerId,
      category: g.category,
      outcomeLabel: label,
      noun: CATEGORY_NOUN[g.category],
      bestOdds: best,
      bestBookmakerId: NICHE_BOOKS[bestSlug],
      quotes: [...g.prices].map(([slug, price]) => ({ bookmakerId: NICHE_BOOKS[slug], price, updatedAt: at })),
      at,
    });
  }
  return out;
}

/** "Salah, Mohamed" → "Mohamed Salah". */
export function displayName(raw: string): string {
  const [last, first] = raw.split(",").map((s) => s.trim());
  return first ? `${first} ${last}` : raw.trim();
}

/**
 * A prop whose player record has been checked and found to clear the price.
 * Fair odds and EV come from the pessimistic chance in his own matches.
 */
export function proveNiche(c: NicheCandidate, name: string, stats: PlayerStatContext): ValueOpportunity {
  const fx = c.fixture;
  const league = LEAGUE_MAP[fx.leagueId];
  const category = c.category;
  const p = stats.modelProbability;
  const ev = expectedValue(c.bestOdds, p);
  const avg = c.quotes.reduce((s, q) => s + q.price, 0) / c.quotes.length;
  const h = stats.history!;
  const confidence: Confidence = h.n >= 10 && h.hitRate >= (1 / c.bestOdds) * 1.25 ? "medium" : "low";
  const line = lineFromLabel(c.outcomeLabel)!;
  const counts = h.counts.join(", ");
  return {
    id: c.id,
    leagueId: fx.leagueId,
    league: league?.name ?? fx.leagueId,
    homeTeam: fx.homeTeam,
    awayTeam: fx.awayTeam,
    homeForm: "",
    awayForm: "",
    startsAt: fx.startsAt,
    market: CATEGORY_MARKET[category],
    marketLabel: CATEGORY_LABEL[category],
    selection: `${name} ${c.outcomeLabel} ${c.noun}`,
    bestOdds: c.bestOdds,
    bestBookmakerId: c.bestBookmakerId,
    averageOdds: Number(avg.toFixed(3)),
    fairOdds: Number((1 / p).toFixed(3)),
    fairBasis: "history",
    fairProbability: Number(p.toFixed(4)),
    openingOdds: c.bestOdds,
    priceMovement: "stable",
    expectedValue: Number(ev.toFixed(4)),
    edgePercent: Number((ev * 100).toFixed(2)),
    // His record is real evidence, but a small sample — keep the stake modest.
    kellyFraction: Number(Math.min(kellyStake(c.bestOdds, p, 1), MAX_KELLY).toFixed(4)),
    confidence,
    signals: [
      `${name} har ramt ${line}+ ${c.noun} i ${h.hits} af de seneste ${h.n} kampe (${counts})`,
      `${BOOK_NAME[c.bestBookmakerId] ?? c.bestBookmakerId} giver ${dk(c.bestOdds)} — prisen kræver kun, at det sker i ${Math.round(100 / c.bestOdds)} % af kampene`,
    ],
    playerStats: stats,
    propSpec: { player: name, stat: category, line },
    quotes: c.quotes,
    booksCount: c.quotes.length,
    detectedAt: c.at,
    read: false,
  };
}
