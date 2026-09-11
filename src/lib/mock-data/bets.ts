import type { Bet, BetStatus, MarketType } from "@/types";
import { MARKET_LABELS } from "@/types";
import { closingLineValue } from "@/lib/betting-math";
import { seededRandom as seedRand } from "@/lib/utils";
import { getLeague } from "./leagues";

/**
 * Deterministic mock football bet history. Generated from a fixed seed so the
 * numbers (P&L, ROI, equity curve) are stable across renders and reloads.
 */

const UNIT_SIZE = 100; // 1 unit = 100 DKK — mirrors the default in settings
const START = new Date("2026-05-12T00:00:00.000Z");
const END = new Date("2026-09-06T12:00:00.000Z");

interface Fixture {
  leagueId: string;
  teams: [string, string];
}

const FIXTURES: Fixture[] = [
  { leagueId: "den-superliga", teams: ["FC København", "Brøndby IF"] },
  { leagueId: "den-superliga", teams: ["FC Midtjylland", "AGF"] },
  { leagueId: "den-superliga", teams: ["FC Nordsjælland", "Silkeborg"] },
  { leagueId: "eng-pl", teams: ["Arsenal", "Manchester City"] },
  { leagueId: "eng-pl", teams: ["Liverpool", "Everton"] },
  { leagueId: "eng-pl", teams: ["Newcastle", "Aston Villa"] },
  { leagueId: "esp-laliga", teams: ["Real Madrid", "Sevilla"] },
  { leagueId: "esp-laliga", teams: ["Barcelona", "Real Sociedad"] },
  { leagueId: "ita-seriea", teams: ["Napoli", "Juventus"] },
  { leagueId: "ita-seriea", teams: ["Inter", "Lazio"] },
  { leagueId: "ger-bundesliga", teams: ["Bayern München", "VfB Stuttgart"] },
  { leagueId: "ger-bundesliga", teams: ["Borussia Dortmund", "Wolfsburg"] },
  { leagueId: "fra-ligue1", teams: ["Paris Saint-Germain", "Lyon"] },
  { leagueId: "ned-eredivisie", teams: ["Ajax", "Feyenoord"] },
  { leagueId: "por-primeira", teams: ["Benfica", "Sporting CP"] },
  { leagueId: "uefa-ucl", teams: ["Inter", "Arsenal"] },
  { leagueId: "uefa-uel", teams: ["AS Roma", "Ajax"] },
  { leagueId: "eng-championship", teams: ["Leeds United", "Leicester"] },
];

interface MarketPick {
  market: MarketType;
  selection: (f: Fixture) => string;
}

const MARKETS: MarketPick[] = [
  { market: "1x2", selection: (f) => f.teams[0] },
  { market: "1x2", selection: () => "Uafgjort" },
  { market: "1x2", selection: (f) => f.teams[1] },
  { market: "over-under", selection: () => "Over 2.5 mål" },
  { market: "over-under", selection: () => "Under 2.5 mål" },
  { market: "over-under", selection: () => "Over 3.5 mål" },
  { market: "btts", selection: () => "Begge hold scorer: Ja" },
  { market: "asian-handicap", selection: (f) => `${f.teams[0]} −1.0` },
  { market: "double-chance", selection: (f) => `${f.teams[0]} eller uafgjort` },
  { market: "draw-no-bet", selection: (f) => f.teams[1] },
  { market: "team-total", selection: (f) => `${f.teams[0]} over 1.5 mål` },
  { market: "corners", selection: () => "Over 9.5 hjørnespark" },
];

const BOOKMAKER_IDS = ["bet365", "unibet", "danske-spil", "betano", "leovegas", "nordicbet", "pinnacle"];

const BET_COUNT = 52;

function pick<T>(arr: T[], r: number): T {
  return arr[Math.floor(r * arr.length) % arr.length];
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function buildBets(): Bet[] {
  const bets: Bet[] = [];
  const span = END.getTime() - START.getTime();
  // Open bets' kick-offs are anchored to real "now" so the countdown stays live.
  const realNow = Date.now();

  for (let i = 0; i < BET_COUNT; i++) {
    const r = (n: number) => seedRand(`bet-${i}-${n}`);

    const fixture = pick(FIXTURES, r(1));
    const marketPick = pick(MARKETS, r(2));
    const bookmakerId = pick(BOOKMAKER_IDS, r(3));

    const placedAt = new Date(START.getTime() + span * ((i + r(4) * 0.6) / BET_COUNT));
    const odds = Number(lerp(1.5, 3.9, r(5) ** 1.15).toFixed(2));
    const impliedProb = 1 / odds;

    const evLogged = Number(lerp(0.01, 0.09, r(6)).toFixed(4));
    const trueProb = Math.min(0.97, impliedProb * (1 + evLogged));

    const stakeUnits = Number(pick([0.5, 1, 1, 1, 1.5, 2, 2, 3], r(7)).toFixed(2));
    const stake = stakeUnits * UNIT_SIZE;

    const isOpen = placedAt.getTime() > END.getTime() - 10 * 86_400_000 && r(8) > 0.25;

    let status: BetStatus;
    let payout = 0;
    let settledAt: string | undefined;

    if (isOpen) {
      status = "pending";
    } else {
      const roll = r(9);
      const won = roll < trueProb * 1.02;
      if (!won && r(10) > 0.94) {
        status = "cashout";
        payout = Number((stake * lerp(0.4, 1.35, r(11))).toFixed(2));
      } else if (won && r(12) > 0.97) {
        status = "half-won";
        payout = Number((stake * (1 + (odds - 1) / 2)).toFixed(2));
      } else {
        status = won ? "won" : "lost";
        payout = won ? Number((stake * odds).toFixed(2)) : 0;
      }
      settledAt = new Date(
        placedAt.getTime() + lerp(2, 72, r(13)) * 3_600_000,
      ).toISOString();
    }

    const profit = Number((payout - stake).toFixed(2));

    // Kick-off: open bets spread around real "now" (some ready to settle, some
    // still to come); settled bets a few hours after they were placed.
    const eventStartsAt = isOpen
      ? new Date(realNow + lerp(-5, 32, r(17)) * 3_600_000).toISOString()
      : new Date(placedAt.getTime() + lerp(1, 9, r(17)) * 3_600_000).toISOString();

    const closingOdds =
      status === "pending"
        ? undefined
        : Number((odds / (1 + lerp(-0.02, 0.05, r(14)))).toFixed(2));
    const clvPercent =
      closingOdds !== undefined
        ? Number((closingLineValue(odds, closingOdds) * 100).toFixed(2))
        : undefined;

    bets.push({
      id: `bet_${String(i + 1).padStart(3, "0")}`,
      placedAt: placedAt.toISOString(),
      settledAt,
      leagueId: fixture.leagueId,
      league: getLeague(fixture.leagueId)?.name ?? fixture.leagueId,
      event: `${fixture.teams[0]} – ${fixture.teams[1]}`,
      eventStartsAt,
      market: marketPick.market,
      marketLabel: MARKET_LABELS[marketPick.market],
      selection: marketPick.selection(fixture),
      bookmakerId,
      odds,
      stake: Number(stake.toFixed(2)),
      stakeUnits,
      status,
      payout,
      profit,
      closingOdds,
      clvPercent,
      expectedValue: evLogged,
      sourceOpportunityId: r(15) > 0.6 ? `vo_seed_${i}` : undefined,
      tags: r(16) > 0.75 ? ["ai-feed"] : undefined,
    });
  }

  return bets.sort(
    (a, b) => new Date(b.placedAt).getTime() - new Date(a.placedAt).getTime(),
  );
}

export const MOCK_BETS: Bet[] = buildBets();
