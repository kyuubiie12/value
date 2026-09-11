import { Wallet, TrendingUp, Percent, Target, Timer, Flame } from "lucide-react";
import type { PortfolioStats } from "@/types";
import {
  formatCurrency,
  formatPercent,
  formatSignedCurrency,
} from "@/lib/format";
import { StatCard } from "@/components/ui/stat-card";

export function KpiGrid({ stats }: { stats: PortfolioStats }) {
  const pnlPositive = stats.totalProfit >= 0;
  const bankrollGrowth =
    (stats.bankroll - stats.startingBankroll) / stats.startingBankroll;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
      <StatCard
        label="Profit / tab"
        value={formatSignedCurrency(stats.totalProfit, stats.currency)}
        icon={TrendingUp}
        tone={pnlPositive ? "positive" : "negative"}
        hint={`${stats.settledBets} afsluttede`}
      />
      <StatCard
        label="ROI"
        value={formatPercent(stats.roi, { signed: true })}
        icon={Percent}
        tone={stats.roi >= 0 ? "positive" : "negative"}
        hint={`${formatCurrency(stats.totalStaked, stats.currency)} omsat`}
      />
      <StatCard
        label="Bankroll"
        value={formatCurrency(stats.bankroll, stats.currency)}
        icon={Wallet}
        delta={bankrollGrowth}
        deltaLabel={formatPercent(bankrollGrowth, { signed: true })}
        hint={`start ${formatCurrency(stats.startingBankroll, stats.currency)}`}
      />
      <StatCard
        label="Hit rate"
        value={formatPercent(stats.hitRate)}
        icon={Target}
        hint={`${stats.wonBets} vundet / ${stats.lostBets} tabt`}
      />
      <StatCard
        label="Åbne bets"
        value={String(stats.openBets)}
        icon={Timer}
        hint={`${formatCurrency(stats.pendingStake, stats.currency)} i spil`}
      />
      <StatCard
        label="Aktuel stime"
        value={
          stats.currentStreak.count === 0
            ? "–"
            : `${stats.currentStreak.count} ${
                stats.currentStreak.type === "win"
                  ? stats.currentStreak.count === 1
                    ? "gevinst"
                    : "gevinster"
                  : "tab"
              }`
        }
        icon={Flame}
        tone={
          stats.currentStreak.count === 0
            ? "neutral"
            : stats.currentStreak.type === "win"
              ? "positive"
              : "negative"
        }
        hint={`Ø odds ${stats.avgOdds.toLocaleString("da-DK", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })} · CLV ${formatPercent(stats.avgClv, { signed: true })}`}
      />
    </div>
  );
}
