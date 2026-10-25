import type {
  Confidence,
  MarketType,
  OddsQuote,
  PriceMovement,
  ValueOpportunity,
} from "@/types";
import { expectedValue, kellyStake, removeVig } from "@/lib/betting-math";
import { LEAGUE_MAP } from "@/lib/mock-data/leagues";
import { BET, MAX_PLAUSIBLE_EV, MIN_EV, PLAYABLE_BOOKS, SHARP_BOOK } from "./config";

/** book id → API bet id → outcome label ("Home", "Over 2.5") → decimal odds. */
export type BookOdds = Record<string, Record<string, Record<string, number>>>;

export interface FixtureRecord {
  fixtureId: number;
  leagueId: string;
  startsAt: string;
  homeTeam: string;
  awayTeam: string;
  odds: BookOdds;
  /** Prices when the fixture was first priced — baseline for movement. */
  openOdds: BookOdds | null;
  oddsUpdatedAt: string | null;
  firstFetchedAt: string | null;
  fetchedAt: string;
}

interface Outcome {
  key: string;
  selection: string;
  bet: string;
  /** Exact outcome label in the provider's data. */
  value: string;
}

interface Group {
  marketKey: string;
  market: MarketType;
  marketLabel: string;
  outcomes: Outcome[];
  /** Fair probability per outcome (same order), or null with no sharp price. */
  fair: number[] | null;
}

const price = (b: BookOdds, book: string, bet: string, value: string) =>
  b[book]?.[bet]?.[value];

/** Half lines only (x.5): whole and quarter lines can push, which a plain two-way de-vig can't price. */
const isHalfLine = (line: number) => Number.isInteger(line * 2) && !Number.isInteger(line);

const fmtLine = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
const signed = (n: number) => (n > 0 ? `+${fmtLine(n)}` : fmtLine(n));

function sharpOneXTwo(b: BookOdds): [number, number, number] | null {
  const h = price(b, SHARP_BOOK, BET.matchWinner, "Home");
  const d = price(b, SHARP_BOOK, BET.matchWinner, "Draw");
  const a = price(b, SHARP_BOOK, BET.matchWinner, "Away");
  if (!h || !d || !a) return null;
  const [ph, pd, pa] = removeVig([h, d, a]);
  return [ph, pd, pa];
}

/** Two-way line markets (over/under, team totals, corners) that Pinnacle prices. */
function lineGroups(
  b: BookOdds,
  bet: string,
  keyPrefix: string,
  market: MarketType,
  labelFor: (line: number) => string,
  selectionFor: (side: "Over" | "Under", line: number) => string,
): Group[] {
  const sharp = b[SHARP_BOOK]?.[bet];
  if (!sharp) return [];
  const lines = new Set<number>();
  for (const value of Object.keys(sharp)) {
    const m = /^Over (\d+(?:\.\d+)?)$/.exec(value);
    if (m) lines.add(Number(m[1]));
  }
  const groups: Group[] = [];
  for (const line of lines) {
    if (!isHalfLine(line)) continue;
    const over = sharp[`Over ${line}`];
    const under = sharp[`Under ${line}`];
    if (!over || !under) continue;
    const [pOver, pUnder] = removeVig([over, under]);
    groups.push({
      marketKey: `${keyPrefix}${fmtLine(line)}`,
      market,
      marketLabel: labelFor(line),
      outcomes: [
        { key: "over", selection: selectionFor("Over", line), bet, value: `Over ${line}` },
        { key: "under", selection: selectionFor("Under", line), bet, value: `Under ${line}` },
      ],
      fair: [pOver, pUnder],
    });
  }
  return groups;
}

function buildGroups(rec: FixtureRecord): Group[] {
  const b = rec.odds;
  const { homeTeam: home, awayTeam: away } = rec;
  const groups: Group[] = [];
  const oneXTwo = sharpOneXTwo(b);

  // 1X2
  groups.push({
    marketKey: "1x2",
    market: "1x2",
    marketLabel: "Kampvinder (1X2)",
    outcomes: [
      { key: "home", selection: home, bet: BET.matchWinner, value: "Home" },
      { key: "draw", selection: "Uafgjort", bet: BET.matchWinner, value: "Draw" },
      { key: "away", selection: away, bet: BET.matchWinner, value: "Away" },
    ],
    fair: oneXTwo,
  });

  // Draw no bet and double chance are derived exactly from the sharp 1X2.
  if (oneXTwo) {
    const [ph, pd, pa] = oneXTwo;
    groups.push({
      marketKey: "dnb",
      market: "draw-no-bet",
      marketLabel: "Draw No Bet",
      outcomes: [
        { key: "home", selection: `${home} (DNB)`, bet: BET.homeAway, value: "Home" },
        { key: "away", selection: `${away} (DNB)`, bet: BET.homeAway, value: "Away" },
      ],
      fair: [ph / (ph + pa), pa / (ph + pa)],
    });
    groups.push({
      marketKey: "dc",
      market: "double-chance",
      marketLabel: "Dobbeltchance",
      outcomes: [
        { key: "1x", selection: `${home} eller uafgjort`, bet: BET.doubleChance, value: "Home/Draw" },
        { key: "12", selection: `${home} eller ${away}`, bet: BET.doubleChance, value: "Home/Away" },
        { key: "x2", selection: `Uafgjort eller ${away}`, bet: BET.doubleChance, value: "Draw/Away" },
      ],
      fair: [ph + pd, ph + pa, pd + pa],
    });
  }

  // Asian handicap — Pinnacle prices "Home L" / "Away L" with the same L.
  const ah = b[SHARP_BOOK]?.[BET.asianHandicap];
  if (ah) {
    for (const value of Object.keys(ah)) {
      const m = /^Home (-?\d+(?:\.\d+)?)$/.exec(value);
      if (!m) continue;
      const line = Number(m[1]);
      if (!isHalfLine(line)) continue;
      const homePrice = ah[`Home ${line}`];
      const awayPrice = ah[`Away ${line}`];
      if (!homePrice || !awayPrice) continue;
      const [pHome, pAway] = removeVig([homePrice, awayPrice]);
      groups.push({
        marketKey: `ah${fmtLine(line)}`,
        market: "asian-handicap",
        marketLabel: `Asiatisk handicap ${signed(line)}`,
        outcomes: [
          { key: "home", selection: `${home} ${signed(line)}`, bet: BET.asianHandicap, value: `Home ${line}` },
          { key: "away", selection: `${away} ${signed(-line)}`, bet: BET.asianHandicap, value: `Away ${line}` },
        ],
        fair: [pHome, pAway],
      });
    }
  }

  groups.push(
    ...lineGroups(
      b,
      BET.goalsOverUnder,
      "ou",
      "over-under",
      (l) => `Mål over/under ${fmtLine(l)}`,
      (side, l) => `${side === "Over" ? "Over" : "Under"} ${fmtLine(l)} mål`,
    ),
    ...lineGroups(
      b,
      BET.homeTotal,
      "tth",
      "team-total",
      (l) => `${home} mål over/under ${fmtLine(l)}`,
      (side, l) => `${home} ${side === "Over" ? "over" : "under"} ${fmtLine(l)} mål`,
    ),
    ...lineGroups(
      b,
      BET.awayTotal,
      "tta",
      "team-total",
      (l) => `${away} mål over/under ${fmtLine(l)}`,
      (side, l) => `${away} ${side === "Over" ? "over" : "under"} ${fmtLine(l)} mål`,
    ),
    ...lineGroups(
      b,
      BET.cornersOverUnder,
      "cor",
      "corners",
      (l) => `Hjørnespark over/under ${fmtLine(l)}`,
      (side, l) => `${side === "Over" ? "Over" : "Under"} ${fmtLine(l)} hjørnespark`,
    ),
  );

  return groups;
}

/** Soft-book quotes for one outcome (reference books are excluded). */
function quotesFor(b: BookOdds, o: Outcome, at: string): OddsQuote[] {
  const quotes: OddsQuote[] = [];
  for (const book of Object.keys(b)) {
    if (!PLAYABLE_BOOKS.has(book)) continue;
    const p = price(b, book, o.bet, o.value);
    if (p && p > 1) quotes.push({ bookmakerId: book, price: p, updatedAt: at });
  }
  return quotes;
}

const dk = (n: number) => n.toFixed(2).replace(".", ",");

const bestPrice = (qs: OddsQuote[]) => qs.reduce((a, q) => (q.price > a ? q.price : a), 0);

function confidenceFor(edge: number, books: number, movement: PriceMovement): Confidence {
  if (edge >= 0.05 && books >= 5 && movement !== "drifting") return "high";
  if (edge >= 0.03 && books >= 3) return "medium";
  return "low";
}

function movementOf(now: number, open: number): PriceMovement {
  if (!open) return "stable";
  const ratio = now / open;
  if (ratio <= 0.99) return "shortening";
  if (ratio >= 1.01) return "drifting";
  return "stable";
}

/**
 * Turn one priced fixture into value opportunities. Fair odds come from the
 * de-vigged Pinnacle price; every other book that prices the same outcome is a
 * candidate. Pure — no I/O — so it can be checked against saved responses.
 */
export function detectValue(rec: FixtureRecord): ValueOpportunity[] {
  const league = LEAGUE_MAP[rec.leagueId];
  const at = rec.oddsUpdatedAt ?? rec.fetchedAt;
  const out: ValueOpportunity[] = [];

  for (const g of buildGroups(rec)) {
    if (!g.fair) continue;
    g.outcomes.forEach((o, i) => {
      const fairP = g.fair![i];
      if (!(fairP > 0 && fairP < 1)) return;
      const quotes = quotesFor(rec.odds, o, at);
      if (!quotes.length) return;

      const best = quotes.reduce((a, q) => (q.price > a.price ? q : a));
      const ev = expectedValue(best.price, fairP);
      if (ev < MIN_EV || ev > MAX_PLAUSIBLE_EV) return;

      const avg = quotes.reduce((s, q) => s + q.price, 0) / quotes.length;
      const openBest = rec.openOdds ? bestPrice(quotesFor(rec.openOdds, o, at)) : 0;
      const movement = movementOf(best.price, openBest);
      const fairOdds = 1 / fairP;

      const signals = [
        `Fair odds ${dk(fairOdds)} (Pinnacle uden margin) — bedste pris ${dk(best.price)} er ${(ev * 100).toFixed(1).replace(".", ",")}% over`,
        `${quotes.length} ${quotes.length === 1 ? "bookmaker" : "bookmakere"} prissætter spillet, gennemsnit ${dk(avg)}`,
      ];
      if (openBest && movement !== "stable") {
        signals.push(
          `Bedste pris er ${movement === "shortening" ? "faldet" : "steget"} fra ${dk(openBest)} til ${dk(best.price)} siden vi første gang så kampen`,
        );
      }

      out.push({
        id: `af_${rec.fixtureId}_${g.marketKey}_${o.key}`,
        leagueId: rec.leagueId,
        league: league?.name ?? rec.leagueId,
        homeTeam: rec.homeTeam,
        awayTeam: rec.awayTeam,
        homeForm: "",
        awayForm: "",
        startsAt: rec.startsAt,
        market: g.market,
        marketLabel: g.marketLabel,
        selection: o.selection,
        bestOdds: best.price,
        bestBookmakerId: best.bookmakerId,
        averageOdds: Number(avg.toFixed(3)),
        fairOdds: Number(fairOdds.toFixed(3)),
        fairProbability: Number(fairP.toFixed(4)),
        openingOdds: openBest || best.price,
        priceMovement: movement,
        expectedValue: Number(ev.toFixed(4)),
        edgePercent: Number((ev * 100).toFixed(2)),
        kellyFraction: Number(kellyStake(best.price, fairP, 1).toFixed(4)),
        confidence: confidenceFor(ev, quotes.length, movement),
        signals,
        quotes,
        booksCount: quotes.length,
        detectedAt: rec.firstFetchedAt ?? rec.fetchedAt,
        read: false,
      });
    });
  }

  return out;
}
