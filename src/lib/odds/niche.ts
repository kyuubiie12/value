import type { Confidence, MarketType, OddsQuote, ValueOpportunity } from "@/types";
import { expectedValue, kellyStake } from "@/lib/betting-math";
import { LEAGUE_MAP } from "@/lib/mock-data/leagues";

/**
 * Player-prop value from OddsPapi. There is no sharp book for these markets, so
 * "fair" is the average of the *other* bookmakers' prices for the very same
 * player / market / line. That is a price disagreement, not a de-vigged true
 * probability — it is flagged `fairBasis: "consensus"` everywhere it shows.
 * Pure: no I/O.
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
const MIN_PRICE = 1.25;
const MAX_PRICE = 6;
const MIN_EV = 0.03;
/** Book prices carry a margin (~7% on player props); take it out of the reference probability. */
const MARGIN_ADJUST = 0.93;
/** Larger gaps are nearly always a different line definition or a stale price, not an edge. */
const MAX_EV_ONE_REF = 0.12;
const MAX_EV_MULTI_REF = 0.15;
/** The other books must roughly agree (best-of-others / worst-of-others) for their average to mean anything. */
const MAX_REF_SPREAD = 1.15;
/** Ceiling on the full-Kelly stake (fraction of bankroll) for consensus-based bets. */
const MAX_KELLY = 0.04;

const dk = (n: number) => n.toFixed(2).replace(".", ",");

export interface NicheCandidate extends Omit<ValueOpportunity, "selection" | "read"> {
  playerId: number;
  /** The line, e.g. "2+" — combined with the player name once names are resolved. */
  outcomeLabel: string;
  noun: string;
}

interface Group {
  m: NicheMarket;
  marketId: number;
  playerId: number;
  outcomeId: number;
  prices: Map<string, number>;
}

/** Find player-prop price gaps for one fixture. Names are attached later. */
export function detectNiche(
  fx: NicheFixture,
  odds: RawNicheOdds,
  markets: NicheMarkets,
  at: string,
): NicheCandidate[] {
  // (market, player, outcome) → price per book
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

  const league = LEAGUE_MAP[fx.leagueId];
  const out: NicheCandidate[] = [];
  for (const g of groups.values()) {
    if (g.prices.size < 2) continue;
    const label = g.m.o[String(g.outcomeId)];
    if (!label || label === "0") continue;

    // Best price, and the average implied probability of everyone else.
    let bestSlug = "";
    let best = 0;
    for (const [slug, p] of g.prices) {
      if (p > best) {
        best = p;
        bestSlug = slug;
      }
    }
    if (best < MIN_PRICE || best > MAX_PRICE) continue;
    const others = [...g.prices].filter(([slug]) => slug !== bestSlug).map(([, p]) => p);
    const pRef = (others.reduce((s, p) => s + 1 / p, 0) / others.length) * MARGIN_ADJUST;
    const ev = expectedValue(best, pRef);
    if (ev < MIN_EV) continue;
    if (others.length === 1 ? ev > MAX_EV_ONE_REF : ev > MAX_EV_MULTI_REF) continue;
    if (others.length > 1 && Math.max(...others) / Math.min(...others) > MAX_REF_SPREAD) continue;

    const quotes: OddsQuote[] = [...g.prices].map(([slug, price]) => ({
      bookmakerId: NICHE_BOOKS[slug],
      price,
      updatedAt: at,
    }));
    const avg = quotes.reduce((s, q) => s + q.price, 0) / quotes.length;
    const fairOdds = 1 / pRef;
    const confidence: Confidence = others.length >= 2 && ev >= 0.05 ? "medium" : "low";
    const category = g.m.c;
    const bestBook = NICHE_BOOKS[bestSlug];

    out.push({
      id: `np_${fx.fixtureId}_${g.marketId}_${g.playerId}_${g.outcomeId}`,
      leagueId: fx.leagueId,
      league: league?.name ?? fx.leagueId,
      homeTeam: fx.homeTeam,
      awayTeam: fx.awayTeam,
      homeForm: "",
      awayForm: "",
      startsAt: fx.startsAt,
      market: CATEGORY_MARKET[category],
      marketLabel: CATEGORY_LABEL[category],
      bestOdds: best,
      bestBookmakerId: bestBook,
      averageOdds: Number(avg.toFixed(3)),
      fairOdds: Number(fairOdds.toFixed(3)),
      fairBasis: "consensus",
      fairProbability: Number(pRef.toFixed(4)),
      openingOdds: best,
      priceMovement: "stable",
      expectedValue: Number(ev.toFixed(4)),
      edgePercent: Number((ev * 100).toFixed(2)),
      // A price gap between soft books is a weaker signal than a sharp reference — cap the stake.
      kellyFraction: Number(Math.min(kellyStake(best, pRef, 1), MAX_KELLY).toFixed(4)),
      confidence,
      signals: [
        `${BOOK_NAME[bestBook] ?? bestBook} giver ${dk(best)}; de andre bookmakere giver i snit ${dk(fairOdds * MARGIN_ADJUST)} (${dk(fairOdds)} uden en typisk margin)`,
        `${quotes.length} bookmakere prissætter samme spiller og linje — ingen skarp reference på spiller-props`,
      ],
      quotes,
      booksCount: quotes.length,
      detectedAt: at,
      playerId: g.playerId,
      outcomeLabel: label,
      noun: CATEGORY_NOUN[category],
    });
  }
  return out.sort((a, b) => b.edgePercent - a.edgePercent).slice(0, 12);
}

/** "Salah, Mohamed" → "Mohamed Salah". */
export function displayName(raw: string): string {
  const [last, first] = raw.split(",").map((s) => s.trim());
  return first ? `${first} ${last}` : raw.trim();
}

/** Attach the resolved player name to a candidate, producing a feed opportunity. */
export function finalizeNiche(c: NicheCandidate, name: string): ValueOpportunity {
  const { playerId, outcomeLabel, noun, ...rest } = c;
  void playerId;
  return {
    ...rest,
    selection: `${name} ${outcomeLabel} ${noun}`,
    read: false,
  };
}
