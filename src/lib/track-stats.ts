import type {
  SettledPick,
  TrackBreakdownDimension,
  TrackBreakdownRow,
  TrackRecordPoint,
  TrackRecordStats,
} from "@/types";
import { LEAGUE_MAP } from "@/lib/mock-data/leagues";

/**
 * Yield, hit rate, CLV, equity curve and breakdowns for any set of settled picks —
 * pure, so the results page can recompute them for whatever the user ticks off.
 */

const graded = (p: SettledPick) => p.result !== "void";
const round = (v: number, d = 0) => {
  const f = 10 ** d;
  return Math.round(v * f) / f;
};

export function statsOf(picks: SettledPick[]): TrackRecordStats {
  const g = picks.filter(graded);
  const staked = g.reduce((s, p) => s + p.stakeUnits, 0);
  const profit = picks.reduce((s, p) => s + p.profitUnits, 0);
  const won = g.filter((p) => p.profitUnits > 0).length;
  const clvBeat = picks.filter((p) => p.clvPercent > 0).length;
  const dates = picks.map((p) => +new Date(p.settledAt));
  const now = new Date().toISOString();

  return {
    picks: picks.length,
    wonPicks: won,
    lostPicks: g.length - won,
    hitRate: g.length ? won / g.length : 0,
    stakedUnits: round(staked, 1),
    profitUnits: round(profit, 1),
    roi: staked ? profit / staked : 0,
    avgOdds: g.length ? round(g.reduce((s, p) => s + p.postedOdds, 0) / g.length, 2) : 0,
    avgEdge: picks.length
      ? round(picks.reduce((s, p) => s + p.edgePercent, 0) / picks.length, 1)
      : 0,
    avgClv: picks.length
      ? picks.reduce((s, p) => s + p.clvPercent, 0) / picks.length / 100
      : 0,
    clvBeatRate: picks.length ? clvBeat / picks.length : 0,
    since: dates.length ? new Date(Math.min(...dates)).toISOString() : now,
    updatedAt: dates.length ? new Date(Math.max(...dates)).toISOString() : now,
  };
}

export function equityOf(picks: SettledPick[]): TrackRecordPoint[] {
  const chrono = [...picks].sort((a, b) => +new Date(a.settledAt) - +new Date(b.settledAt));
  const points: TrackRecordPoint[] = [
    {
      date: chrono[0]
        ? new Date(new Date(chrono[0].settledAt).getTime() - 86_400_000).toISOString()
        : new Date().toISOString(),
      cumulativeUnits: 0,
      picks: 0,
    },
  ];
  let cum = 0;
  chrono.forEach((p, i) => {
    cum += p.profitUnits;
    points.push({ date: p.settledAt, cumulativeUnits: round(cum, 2), picks: i + 1 });
  });
  return points;
}

export function breakdownOf(
  dimension: TrackBreakdownDimension,
  picks: SettledPick[],
): TrackBreakdownRow[] {
  const groups = new Map<string, { label: string; picks: SettledPick[] }>();

  for (const p of picks) {
    let key: string;
    let label: string;
    switch (dimension) {
      case "market":
        key = p.market;
        label = p.marketLabel;
        break;
      case "league":
        key = p.leagueId;
        label = LEAGUE_MAP[p.leagueId]?.name ?? p.league;
        break;
      case "edge":
        if (p.edgePercent >= 5) [key, label] = ["c", "5%+ EV"];
        else if (p.edgePercent >= 3.5) [key, label] = ["b", "3,5–5% EV"];
        else [key, label] = ["a", "Under 3,5% EV"];
        break;
      case "month": {
        const d = new Date(p.settledAt);
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        label = d.toLocaleDateString("da-DK", { month: "long", year: "numeric" });
        break;
      }
    }
    if (!groups.has(key)) groups.set(key, { label, picks: [] });
    groups.get(key)!.picks.push(p);
  }

  return [...groups.entries()]
    .map(([key, { label, picks: gp }]) => {
      const g = gp.filter(graded);
      const staked = g.reduce((s, p) => s + p.stakeUnits, 0);
      const profit = gp.reduce((s, p) => s + p.profitUnits, 0);
      const won = g.filter((p) => p.profitUnits > 0).length;
      return {
        key,
        label,
        picks: gp.length,
        profitUnits: round(profit, 1),
        roi: staked ? profit / staked : 0,
        hitRate: g.length ? won / g.length : 0,
        avgClv: gp.length ? gp.reduce((s, p) => s + p.clvPercent, 0) / gp.length / 100 : 0,
      };
    })
    .sort((a, b) =>
      dimension === "month" || dimension === "edge"
        ? a.key.localeCompare(b.key)
        : b.profitUnits - a.profitUnits,
    );
}
