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

const BOOK_NAME: Record<string, string> = { bet365: "Bet365", betano: "Betano", bwin: "Bwin" };

/** Compact market dictionary kept in the database (outcome id → label). */
export interface NicheMarket {
  c: NicheCategory;
  n: string;
  o: Record<string, string>;
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
  m: NicheMarket;
  marketId: number;
  playerId: number;
  outcomeId: number;
  prices: Map<string, number>;
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
      const key = `${o.marketId}|${o.playerId}|${o.outcomeId}`;
      let g = groups.get(key);
      if (!g) {
        g = { m, marketId: o.marketId, playerId: o.playerId, outcomeId: o.outcomeId, prices: new Map() };
        groups.set(key, g);
      }
      g.prices.set(slug, o.price);
    }
  }

  const out: NicheCandidate[] = [];
  for (const g of groups.values()) {
    const label = g.m.o[String(g.outcomeId)];
    if (!label || lineFromLabel(label) === null) continue;
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
      id: `np_${fx.fixtureId}_${g.marketId}_${g.playerId}_${g.outcomeId}`,
      fixture: fx,
      playerId: g.playerId,
      category: g.m.c,
      outcomeLabel: label,
      noun: CATEGORY_NOUN[g.m.c],
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
