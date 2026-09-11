import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { ResultsView } from "@/components/results/results-view";
import { trackRecordService } from "@/lib/services";

export const metadata: Metadata = {
  title: "Resultater",
  description:
    "AI'ens track record — hver eneste value bet der er lagt op, gradueret mod slutodds. Transparent bevis for at feedet slår markedet.",
};

export default async function ResultsPage() {
  const [stats, equity, picks, byMarket, byLeague, byEdge, byMonth] =
    await Promise.all([
      trackRecordService.getStats(),
      trackRecordService.getEquityCurve(),
      trackRecordService.listPicks(),
      trackRecordService.getBreakdown("market"),
      trackRecordService.getBreakdown("league"),
      trackRecordService.getBreakdown("edge"),
      trackRecordService.getBreakdown("month"),
    ]);

  return (
    <div className="flex flex-col gap-7">
      <PageHeader
        title="Resultater"
        description="Hver value bet AI'en har lagt op siden april — gradueret mod slutodds. Ingen redigering, ingen cherry-picking."
      />
      <ResultsView
        stats={stats}
        equity={equity}
        picks={picks}
        breakdowns={{
          market: byMarket,
          league: byLeague,
          edge: byEdge,
          month: byMonth,
        }}
      />
    </div>
  );
}
