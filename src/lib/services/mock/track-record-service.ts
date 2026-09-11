import type { SettledPick } from "@/types";
import {
  MOCK_TRACK_RECORD,
  computeMarketPerformance,
  computeTrackBreakdown,
  computeTrackEquity,
  computeTrackStats,
} from "@/lib/mock-data";
import { delay } from "@/lib/utils";
import type { TrackRecordFilters, TrackRecordService } from "../types";

function applyFilters(
  picks: SettledPick[],
  f: TrackRecordFilters = {},
): SettledPick[] {
  let out = [...picks];
  if (f.markets?.length) out = out.filter((p) => f.markets!.includes(p.market));
  if (f.leagueIds?.length)
    out = out.filter((p) => f.leagueIds!.includes(p.leagueId));
  if (f.result === "won") out = out.filter((p) => p.profitUnits > 0);
  if (f.result === "lost") out = out.filter((p) => p.profitUnits < 0);
  if (f.from) out = out.filter((p) => p.settledAt >= f.from!);
  if (f.to) out = out.filter((p) => p.settledAt <= f.to!);
  return out;
}

export function createMockTrackRecordService(): TrackRecordService {
  const store = MOCK_TRACK_RECORD;
  return {
    async getStats() {
      return delay(computeTrackStats(store));
    },
    async getEquityCurve() {
      return delay(computeTrackEquity(store));
    },
    async listPicks(filters) {
      return delay(applyFilters(store, filters));
    },
    async getBreakdown(dimension) {
      return delay(computeTrackBreakdown(dimension, store));
    },
    async getMarketPerformance(market) {
      return delay(computeMarketPerformance(market, store), 90);
    },
  };
}
