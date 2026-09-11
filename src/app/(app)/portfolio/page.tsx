import type { Metadata } from "next";
import type {
  Bet,
  EquityPoint,
  PerformanceBreakdown,
  PortfolioStats,
} from "@/types";
import { PageHeader } from "@/components/shared/page-header";
import { KpiGrid } from "@/components/portfolio/kpi-grid";
import { OpenBetsPanel } from "@/components/portfolio/open-bets-panel";
import { PerformanceChart } from "@/components/portfolio/performance-chart";
import { BreakdownPanel } from "@/components/portfolio/breakdown-panel";
import { BetHistoryTable } from "@/components/portfolio/bet-history-table";
import { PortfolioEmpty } from "@/components/portfolio/portfolio-empty";
import { ClvCard } from "@/components/portfolio/clv-card";
import { portfolioService } from "@/lib/services";

export const metadata: Metadata = {
  title: "Min Portfolio",
  description:
    "P&L, ROI, bankroll-udvikling og fuld spilhistorik for din fodbold-portfolio.",
};

export default async function PortfolioPage() {
  const [stats, equity, bets, byLeague, byBook, byMarket, byMonth] =
    await Promise.all([
      portfolioService.getStats(),
      portfolioService.getEquityCurve(),
      portfolioService.listBets(),
      portfolioService.getBreakdown("league"),
      portfolioService.getBreakdown("bookmaker"),
      portfolioService.getBreakdown("market"),
      portfolioService.getBreakdown("month"),
    ]);

  return (
    <div className="flex flex-col gap-7">
      <PageHeader
        title="Min Portfolio"
        description="Samlet resultat, bankroll-udvikling og fuld spilhistorik — alt hvad du følger og har logget."
      />

      {bets.length === 0 ? (
        <PortfolioEmpty />
      ) : (
        <PortfolioBody
          stats={stats}
          equity={equity}
          bets={bets}
          breakdowns={{
            league: byLeague,
            bookmaker: byBook,
            market: byMarket,
            month: byMonth,
          }}
        />
      )}
    </div>
  );
}

function PortfolioBody({
  stats,
  equity,
  bets,
  breakdowns,
}: {
  stats: PortfolioStats;
  equity: EquityPoint[];
  bets: Bet[];
  breakdowns: Record<
    "league" | "bookmaker" | "market" | "month",
    PerformanceBreakdown[]
  >;
}) {
  return (
    <>
      <KpiGrid stats={stats} />

      <OpenBetsPanel bets={bets} currency={stats.currency} />

      <ClvCard bets={bets} />

      <div className="grid grid-cols-1 gap-3.5 xl:grid-cols-5">
        <div className="min-w-0 xl:col-span-3">
          <PerformanceChart data={equity} currency={stats.currency} />
        </div>
        <div className="min-w-0 xl:col-span-2">
          <BreakdownPanel data={breakdowns} currency={stats.currency} />
        </div>
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold tracking-tight text-fg">
            Spilhistorik
          </h2>
          <span className="text-[11px] text-subtle">
            {stats.openBets} åbne · {stats.settledBets} afsluttede
          </span>
        </div>
        <BetHistoryTable bets={bets} currency={stats.currency} />
      </section>
    </>
  );
}
