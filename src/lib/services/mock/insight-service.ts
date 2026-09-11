import type { ValueOpportunity } from "@/types";
import { formatPercent } from "@/lib/format";
import { delay } from "@/lib/utils";
import type { InsightService, OpportunityInsight } from "../types";

/** Built-in fallback: reuse the opportunity's seed signals + a templated take. */
export function createMockInsightService(): InsightService {
  return {
    async analyse(o: ValueOpportunity): Promise<OpportunityInsight> {
      const edge = formatPercent(o.bestOdds / o.fairOdds - 1, { signed: true });
      const move =
        o.priceMovement === "shortening"
          ? "og prisen er faldet siden vi fandt den, hvilket bekræfter markedet"
          : o.priceMovement === "drifting"
            ? "men prisen er steget siden vi fandt den — hold øje"
            : "og prisen har ligget stabilt";
      return delay({
        signals: o.signals,
        summary: `${o.selection} hos ${o.bestBookmakerId} giver ${edge} mod fair odds, ${move}.`,
        source: "fallback",
      });
    },
  };
}
