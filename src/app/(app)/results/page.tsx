import type { Metadata } from "next";
import { Hourglass } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ResultsView } from "@/components/results/results-view";
import { trackRecordService } from "@/lib/services";

export const metadata: Metadata = {
  title: "Resultater",
  description:
    "AI'ens track record — hver eneste value bet der er lagt op, gradueret mod slutodds. Transparent bevis for at feedet slår markedet.",
};

export default async function ResultsPage() {
  const [stats, picks] = await Promise.all([
    trackRecordService.getStats(),
    trackRecordService.listPicks(),
  ]);

  return (
    <div className="flex flex-col gap-7">
      <PageHeader
        title="Resultater"
        description="Hvert value bet, feedet finder, bliver gemt til den pris, vi så det til — og gjort op, når kampen er slut. 1 enhed pr. spil, ingen redigering."
      />
      {stats.picks === 0 ? (
        <EmptyState
          icon={Hourglass}
          title="Ingen afgjorte spil endnu"
          description={
            stats.pendingPicks
              ? `${stats.pendingPicks} value bets er gemt og afventer, at kampene bliver spillet. Resultaterne dukker op her, så snart de er gjort op.`
              : "Her samles resultaterne af de value bets, feedet finder fra nu af. Det første spil bliver gjort op, når dets kamp er slut."
          }
        />
      ) : (
        <ResultsView picks={picks} />
      )}
    </div>
  );
}
