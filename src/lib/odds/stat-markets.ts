import type { Confidence, OddsQuote, PlayerStatContext, StatSpec, ValueOpportunity } from "@/types";
import { expectedValue, kellyStake } from "@/lib/betting-math";
import { LEAGUE_MAP } from "@/lib/mock-data/leagues";
import { getBookmaker } from "@/lib/mock-data";
import { MIN_MATCHES, wilsonLower } from "./history-model";
import { poissonAtLeast } from "./player-model";
import { NICHE_BOOKS, type NicheFixture, type RawNicheOdds } from "./niche";
import type { MatchStats, StatPeriod } from "./sportapi";

/**
 * Cards and corners in the match, a half, or for one team (OddsPapi "bookings" and
 * "corners" over/under). No sharp book prices these, so — like the player props —
 * nothing is value on its own: a line is only shown when both teams' own recent
 * matches prove the price too big. Pure: no I/O.
 */

export type StatCategory = "cards" | "corners";
export type StatScope = "match" | "home" | "away";

/** Compact catalogue entry, kept in the database. */
export interface StatMarket {
  k: StatCategory;
  s: StatScope;
  p: StatPeriod;
  h: number;
  o: Record<string, string>;
}
export type StatMarkets = Record<string, StatMarket>;

const PERIOD: Record<string, StatPeriod> = { fulltime: "ft", p1: "1h", p2: "2h" };

/** Which `/markets` rows we keep for the dictionary. Whole-match corners are priced against Pinnacle elsewhere. */
export function statMarketOf(m: {
  marketType: string;
  period: string;
  playerProp: boolean;
  handicap: number;
  outcomes: { outcomeId: number; outcomeName: string }[];
}): StatMarket | null {
  if (m.playerProp) return null;
  const hit = /^(totals|teamtotals-team1|teamtotals-team2)-(bookings|corners)$/.exec(m.marketType);
  const p = PERIOD[m.period];
  if (!hit || !p || !m.handicap || Number.isInteger(m.handicap)) return null;
  const s: StatScope = hit[1] === "totals" ? "match" : hit[1] === "teamtotals-team1" ? "home" : "away";
  const k: StatCategory = hit[2] === "bookings" ? "cards" : "corners";
  if (k === "corners" && s === "match" && p === "ft") return null;
  return {
    k,
    s,
    p,
    h: m.handicap,
    o: Object.fromEntries(m.outcomes.map((o) => [String(o.outcomeId), o.outcomeName])),
  };
}

const MIN_PRICE = 1.3;
const MAX_PRICE = 4.5;
const MAX_KELLY = 0.04;
const dk = (n: number) => n.toFixed(2).replace(".", ",");

export interface StatCandidate {
  id: string;
  fixture: NicheFixture;
  spec: StatSpec;
  bestOdds: number;
  bestBookmakerId: string;
  quotes: OddsQuote[];
  at: string;
}

/** Every priced over/under line on cards and corners that our Danish books offer, at its best price. */
export function listStatCandidates(
  fx: NicheFixture,
  odds: RawNicheOdds,
  markets: StatMarkets,
  at: string,
): StatCandidate[] {
  const groups = new Map<string, { spec: StatSpec; prices: Map<string, number> }>();
  for (const [slug, outcomes] of Object.entries(odds)) {
    if (!NICHE_BOOKS[slug]) continue;
    for (const o of Object.values(outcomes)) {
      if (o.active === false || o.playerId || !(o.price > 1)) continue;
      const m = markets[String(o.marketId)];
      if (!m) continue;
      const name = m.o[String(o.outcomeId)];
      const side = name === "Over" ? "over" : name === "Under" ? "under" : null;
      if (!side) continue;
      const key = `${m.k}|${m.s}|${m.p}|${m.h}|${side}`;
      let g = groups.get(key);
      if (!g) {
        g = { spec: { category: m.k, scope: m.s, period: m.p, side, line: m.h }, prices: new Map() };
        groups.set(key, g);
      }
      g.prices.set(slug, Math.max(g.prices.get(slug) ?? 0, o.price));
    }
  }

  const out: StatCandidate[] = [];
  for (const [key, g] of groups) {
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
      id: `ts_${fx.fixtureId}_${key.replace(/\|/g, "_")}`,
      fixture: fx,
      spec: g.spec,
      bestOdds: best,
      bestBookmakerId: NICHE_BOOKS[bestSlug],
      quotes: [...g.prices].map(([slug, price]) => ({ bookmakerId: NICHE_BOOKS[slug], price, updatedAt: at })),
      at,
    });
  }
  return out;
}

/** One recent match of a team, with its statistics. */
export interface StatSample {
  date: string;
  /** Was the team playing at home in that match? */
  home: boolean;
  stats: MatchStats;
}

/**
 * The stat in each of the teams' recent matches, newest first: the match total for a
 * whole-match line (both teams' recent matches pooled), or that team's own number.
 */
export function countsFor(
  spec: StatSpec,
  samples: { home: StatSample[]; away: StatSample[] },
): number[] {
  const rows: { date: string; v: number }[] = [];
  const take = (list: StatSample[], side: "home" | "away" | "both") => {
    for (const s of list) {
      const pair = (spec.category === "cards" ? s.stats.cards : s.stats.corners)[spec.period];
      if (!pair) continue;
      const v = side === "both" ? pair[0] + pair[1] : s.home ? pair[0] : pair[1];
      rows.push({ date: s.date, v });
    }
  };
  if (spec.scope === "match") {
    take(samples.home, "both");
    take(samples.away, "both");
  } else {
    take(spec.scope === "home" ? samples.home : samples.away, spec.scope);
  }
  return rows.sort((a, b) => b.date.localeCompare(a.date)).map((r) => r.v);
}

/** The record behind one line: hit rate, the pessimistic chance and a Poisson cross-check. */
export function statContext(
  spec: StatSpec,
  counts: number[],
  subject: string,
  metric: string,
  season: number,
): PlayerStatContext | null {
  const n = counts.length;
  if (n < MIN_MATCHES) return null;
  const over = spec.side === "over";
  const hits = counts.filter((c) => (over ? c > spec.line : c < spec.line)).length;
  const total = counts.reduce((s, c) => s + c, 0);
  const mean = total / n;
  const atLeast = poissonAtLeast(mean, Math.floor(spec.line) + 1);
  const lower = wilsonLower(hits, n);
  return {
    player: subject,
    season,
    metric,
    games: n,
    total,
    perGame: Number(mean.toFixed(2)),
    // "over 3.5" needs 4+; for "under" the line is read from `statSpec` instead.
    line: Math.floor(spec.line) + 1,
    modelProbability: Number(lower.toFixed(4)),
    modelFairOdds: lower > 0 ? Number((1 / lower).toFixed(3)) : 0,
    history: {
      counts,
      hits,
      n,
      hitRate: Number((hits / n).toFixed(4)),
      poisson: Number((over ? atLeast : 1 - atLeast).toFixed(4)),
    },
  };
}

const NOUN: Record<StatCategory, string> = { cards: "kort", corners: "hjørnespark" };
const PERIOD_TEXT: Record<StatPeriod, string> = { ft: "", "1h": " i 1. halvleg", "2h": " i 2. halvleg" };

/** "Over 4.5 kort i kampen", "Brøndby under 1.5 kort i 1. halvleg" … */
export function statSelection(spec: StatSpec, fx: NicheFixture): string {
  const side = spec.side === "over" ? "over" : "under";
  const who = spec.scope === "match" ? "" : `${spec.scope === "home" ? fx.homeTeam : fx.awayTeam} `;
  const where = spec.scope === "match" && spec.period === "ft" ? " i kampen" : PERIOD_TEXT[spec.period];
  const head = who ? `${who}${side}` : `${side[0].toUpperCase()}${side.slice(1)}`;
  return `${head} ${spec.line} ${NOUN[spec.category]}${where}`;
}

export function statSubject(spec: StatSpec, fx: NicheFixture): { subject: string; metric: string } {
  const where = spec.scope === "match" && spec.period === "ft" ? " i kampen" : PERIOD_TEXT[spec.period];
  return spec.scope === "match"
    ? { subject: `${fx.homeTeam} og ${fx.awayTeam}`, metric: `${NOUN[spec.category]}${where}` }
    : {
        subject: spec.scope === "home" ? fx.homeTeam : fx.awayTeam,
        metric: `${NOUN[spec.category]}${where}`,
      };
}

/** A line whose record has been checked and found to clear the price. */
export function proveStat(c: StatCandidate, stats: PlayerStatContext): ValueOpportunity {
  const fx = c.fixture;
  const league = LEAGUE_MAP[fx.leagueId];
  const spec = c.spec;
  const p = stats.modelProbability;
  const ev = expectedValue(c.bestOdds, p);
  const avg = c.quotes.reduce((s, q) => s + q.price, 0) / c.quotes.length;
  const h = stats.history!;
  const confidence: Confidence = h.n >= 12 && h.hitRate >= (1 / c.bestOdds) * 1.25 ? "medium" : "low";
  const bookName = getBookmaker(c.bestBookmakerId)?.name ?? c.bestBookmakerId;
  const periodLabel = spec.scope === "match" && spec.period === "ft" ? "i kampen" : PERIOD_TEXT[spec.period].trim();
  const scopeLabel = spec.scope === "match" ? "" : `${spec.scope === "home" ? fx.homeTeam : fx.awayTeam} `;
  return {
    id: c.id,
    leagueId: fx.leagueId,
    league: league?.name ?? fx.leagueId,
    homeTeam: fx.homeTeam,
    awayTeam: fx.awayTeam,
    homeForm: "",
    awayForm: "",
    startsAt: fx.startsAt,
    ...(fx.homeId && fx.awayId ? { teamIds: { home: fx.homeId, away: fx.awayId } } : {}),
    market: spec.category,
    marketLabel: `${scopeLabel}${NOUN[spec.category][0].toUpperCase()}${NOUN[spec.category].slice(1)} ${periodLabel} over/under ${spec.line}`.replace(/\s+/g, " "),
    selection: statSelection(spec, fx),
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
    kellyFraction: Number(Math.min(kellyStake(c.bestOdds, p, 1), MAX_KELLY).toFixed(4)),
    confidence,
    signals: [
      `${stats.player}: ${spec.side === "over" ? "over" : "under"} ${spec.line} ${stats.metric} i ${h.hits} af de seneste ${h.n} kampe (${h.counts.join(", ")})`,
      `${bookName} giver ${dk(c.bestOdds)} — prisen kræver kun, at det sker i ${Math.round(100 / c.bestOdds)} % af kampene`,
    ],
    playerStats: stats,
    statSpec: spec,
    quotes: c.quotes,
    booksCount: c.quotes.length,
    detectedAt: c.at,
    read: false,
  };
}
