import "server-only";
import type { SettledPick, TrackRecordStats } from "@/types";
import {
  computeMarketPerformance,
  computeTrackBreakdown,
  computeTrackEquity,
  computeTrackStats,
} from "@/lib/mock-data";
import { countPendingPicks, loadSettledPicks } from "@/lib/track/store";
import type { TrackRecordFilters, TrackRecordService } from "../types";

function applyFilters(picks: SettledPick[], f: TrackRecordFilters = {}): SettledPick[] {
  let out = [...picks];
  if (f.markets?.length) out = out.filter((p) => f.markets!.includes(p.market));
  if (f.leagueIds?.length) out = out.filter((p) => f.leagueIds!.includes(p.leagueId));
  if (f.result === "won") out = out.filter((p) => p.profitUnits > 0);
  if (f.result === "lost") out = out.filter((p) => p.profitUnits < 0);
  if (f.from) out = out.filter((p) => p.settledAt >= f.from!);
  if (f.to) out = out.filter((p) => p.settledAt <= f.to!);
  return out;
}

const EMPTY: Omit<TrackRecordStats, "since" | "updatedAt"> = {
  picks: 0,
  wonPicks: 0,
  lostPicks: 0,
  hitRate: 0,
  stakedUnits: 0,
  profitUnits: 0,
  roi: 0,
  avgOdds: 0,
  avgEdge: 0,
  avgClv: 0,
  clvBeatRate: 0,
};

/**
 * The real track record — only value bets the feed itself found and that have
 * since been graded from the match result (see `lib/track`). Nothing is seeded:
 * it starts empty and fills as matches finish. Flat 1 unit per pick.
 */
export function createDbTrackRecordService(): TrackRecordService {
  return {
    async getStats() {
      const [picks, pending] = await Promise.all([loadSettledPicks(), countPendingPicks()]);
      const stats =
        picks.length > 0
          ? computeTrackStats(picks)
          : { ...EMPTY, since: new Date().toISOString(), updatedAt: new Date().toISOString() };
      return { ...stats, pendingPicks: pending };
    },
    async getEquityCurve() {
      return computeTrackEquity(await loadSettledPicks());
    },
    async listPicks(filters) {
      return applyFilters(await loadSettledPicks(), filters);
    },
    async getBreakdown(dimension) {
      return computeTrackBreakdown(dimension, await loadSettledPicks());
    },
    async getMarketPerformance(market) {
      return computeMarketPerformance(market, await loadSettledPicks());
    },
  };
}
