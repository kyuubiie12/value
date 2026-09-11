import type {
  Bet,
  BreakdownDimension,
  EquityPoint,
  PerformanceBreakdown,
  PortfolioStats,
} from "@/types";
import { roi } from "@/lib/betting-math";
import { MOCK_BETS } from "./bets";
import { BOOKMAKER_MAP } from "./bookmakers";
import { LEAGUE_MAP } from "./leagues";
import { DEFAULT_SETTINGS } from "./settings";

const SETTLED_STATUSES = new Set(["won", "lost", "cashout", "half-won", "half-lost", "void"]);

function isSettled(bet: Bet): boolean {
  return SETTLED_STATUSES.has(bet.status);
}

export function computePortfolioStats(
  bets: Bet[] = MOCK_BETS,
  startingBankroll = DEFAULT_SETTINGS.startingBankroll,
): PortfolioStats {
  const settled = bets.filter(isSettled);
  const open = bets.filter((b) => b.status === "pending");

  const totalStaked = settled.reduce((s, b) => s + b.stake, 0);
  const realisedProfit = settled.reduce((s, b) => s + b.profit, 0);
  const pendingStake = open.reduce((s, b) => s + b.stake, 0);

  const wonBets = settled.filter((b) => b.profit > 0).length;
  const lostBets = settled.filter((b) => b.profit < 0).length;

  const avgOdds = settled.length
    ? settled.reduce((s, b) => s + b.odds, 0) / settled.length
    : 0;
  const avgStake = settled.length ? totalStaked / settled.length : 0;

  const clvSamples = settled
    .map((b) => b.clvPercent)
    .filter((v): v is number => typeof v === "number");
  const avgClv = clvSamples.length
    ? clvSamples.reduce((s, v) => s + v, 0) / clvSamples.length / 100
    : 0;

  // Current streak from most-recent settled bets.
  const chrono = [...settled].sort(
    (a, b) =>
      new Date(b.settledAt ?? b.placedAt).getTime() -
      new Date(a.settledAt ?? a.placedAt).getTime(),
  );
  const streakType: "win" | "loss" =
    (chrono[0]?.profit ?? 0) >= 0 ? "win" : "loss";
  let streakCount = 0;
  for (const bet of chrono) {
    const win = bet.profit >= 0;
    if ((win && streakType === "win") || (!win && streakType === "loss")) streakCount++;
    else break;
  }

  return {
    currency: DEFAULT_SETTINGS.currency,
    startingBankroll,
    bankroll: startingBankroll + realisedProfit,
    totalStaked: round(totalStaked),
    totalProfit: round(realisedProfit),
    roi: roi(realisedProfit, totalStaked),
    realisedProfit: round(realisedProfit),
    pendingStake: round(pendingStake),
    hitRate: settled.length ? wonBets / settled.length : 0,
    avgOdds: round(avgOdds, 2),
    avgStake: round(avgStake),
    betCount: bets.length,
    openBets: open.length,
    settledBets: settled.length,
    wonBets,
    lostBets,
    avgClv,
    currentStreak: { type: streakType, count: streakCount },
    updatedAt: new Date("2026-09-06T12:00:00.000Z").toISOString(),
  };
}

export function computeEquityCurve(
  bets: Bet[] = MOCK_BETS,
  startingBankroll = DEFAULT_SETTINGS.startingBankroll,
): EquityPoint[] {
  const settled = bets
    .filter(isSettled)
    .sort(
      (a, b) =>
        new Date(a.settledAt ?? a.placedAt).getTime() -
        new Date(b.settledAt ?? b.placedAt).getTime(),
    );

  const points: EquityPoint[] = [];
  let cumulativeProfit = 0;
  let stakedToDate = 0;
  let betsToDate = 0;

  const startDate = settled[0]
    ? new Date(new Date(settled[0].settledAt ?? settled[0].placedAt).getTime() - 86_400_000)
    : new Date("2026-05-11T00:00:00.000Z");

  points.push({
    date: startDate.toISOString(),
    bankroll: startingBankroll,
    cumulativeProfit: 0,
    stakedToDate: 0,
    betsToDate: 0,
  });

  for (const bet of settled) {
    cumulativeProfit += bet.profit;
    stakedToDate += bet.stake;
    betsToDate += 1;
    points.push({
      date: bet.settledAt ?? bet.placedAt,
      bankroll: round(startingBankroll + cumulativeProfit),
      cumulativeProfit: round(cumulativeProfit),
      stakedToDate: round(stakedToDate),
      betsToDate,
    });
  }

  return points;
}

export function computeBreakdown(
  dimension: BreakdownDimension,
  bets: Bet[] = MOCK_BETS,
): PerformanceBreakdown[] {
  const settled = bets.filter(isSettled);
  const groups = new Map<string, { label: string; bets: Bet[] }>();

  for (const bet of settled) {
    let key: string;
    let label: string;
    switch (dimension) {
      case "league":
        key = bet.leagueId;
        label = LEAGUE_MAP[bet.leagueId]?.name ?? bet.league;
        break;
      case "bookmaker":
        key = bet.bookmakerId;
        label = BOOKMAKER_MAP[bet.bookmakerId]?.name ?? bet.bookmakerId;
        break;
      case "market":
        key = bet.market;
        label = bet.marketLabel;
        break;
      case "month": {
        const d = new Date(bet.settledAt ?? bet.placedAt);
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        label = d.toLocaleDateString("da-DK", { month: "long", year: "numeric" });
        break;
      }
    }
    if (!groups.has(key)) groups.set(key, { label, bets: [] });
    groups.get(key)!.bets.push(bet);
  }

  return [...groups.entries()]
    .map(([key, { label, bets: groupBets }]) => {
      const staked = groupBets.reduce((s, b) => s + b.stake, 0);
      const profit = groupBets.reduce((s, b) => s + b.profit, 0);
      const won = groupBets.filter((b) => b.profit > 0).length;
      return {
        key,
        label,
        bets: groupBets.length,
        staked: round(staked),
        profit: round(profit),
        roi: roi(profit, staked),
        hitRate: groupBets.length ? won / groupBets.length : 0,
      };
    })
    .sort((a, b) => b.profit - a.profit);
}

function round(value: number, digits = 0): number {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}

export const MOCK_PORTFOLIO_STATS = computePortfolioStats();
export const MOCK_EQUITY_CURVE = computeEquityCurve();
