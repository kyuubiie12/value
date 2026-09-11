import type { Metadata } from "next";
import Link from "next/link";
import { SlidersHorizontal } from "lucide-react";
import { ValueFeed } from "@/components/value-bets/value-feed";
import { TrustStrip } from "@/components/value-bets/trust-strip";
import { AutoFollowSync } from "@/components/value-bets/auto-follow-sync";
import { EmptyState } from "@/components/shared/empty-state";
import { restrictOpportunityToBooks } from "@/lib/restrict-opportunity";
import {
  bookmakerService,
  leagueService,
  portfolioService,
  settingsService,
  trackRecordService,
  valueService,
} from "@/lib/services";

export const metadata: Metadata = {
  title: "Value Feed",
  description:
    "AI-fundne value-odds på fodbold — bedste odds mod fair odds på tværs af bookmakere.",
};

export default async function ValueBetsPage() {
  const [raw, bookmakers, leagues, stats, settings, trackStats, bets] =
    await Promise.all([
      valueService.listOpportunities(),
      bookmakerService.list(),
      leagueService.list(),
      portfolioService.getStats(),
      settingsService.get(),
      trackRecordService.getStats(),
      portfolioService.listBets(),
    ]);

  // Open bets the user follows, keyed by opportunity id.
  const trackedBets: Record<
    string,
    { stake: number; odds: number; auto?: boolean }
  > = {};
  for (const b of bets) {
    if (b.sourceOpportunityId && b.status === "pending") {
      trackedBets[b.sourceOpportunityId] = {
        stake: b.stake,
        odds: b.odds,
        auto: b.tags?.includes("auto-follow"),
      };
    }
  }

  // Only show value we can actually get at the user's bookmakers, and above the
  // EV floor they set on their profile.
  const opportunities = raw
    .map((o) => restrictOpportunityToBooks(o, settings.activeBookmakerIds))
    .filter((o): o is NonNullable<typeof o> => o !== null)
    .filter((o) => o.expectedValue >= settings.minEdge)
    .sort((a, b) => b.edgePercent - a.edgePercent);

  return (
    <div className="flex flex-col gap-6">
      <AutoFollowSync enabled={settings.autoFollow} />

      <header className="flex flex-col gap-1.5">
        <h1 className="font-display text-xl font-semibold tracking-tight text-fg sm:text-[1.4rem]">
          Value Feed
        </h1>
        <p className="max-w-xl text-[13px] leading-relaxed text-muted">
          AI&apos;en scanner fodboldodds fra dine bookmakere og markerer spil,
          hvor den bedste pris ligger over fair odds.
        </p>
      </header>

      <TrustStrip stats={trackStats} />

      {opportunities.length === 0 ? (
        <EmptyState
          icon={SlidersHorizontal}
          title={
            settings.activeBookmakerIds.length === 0
              ? "Du har ikke valgt nogen bookmakere endnu"
              : "Ingen value bets hos dine bookmakere lige nu"
          }
          description="Feedet regner kun value på de odds du faktisk kan spille. Vælg flere bookmakere på din profil."
          action={
            <Link
              href="/profile"
              className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-sm)] bg-primary px-4 text-[13px] font-medium text-primary-contrast transition-colors hover:bg-primary-strong"
            >
              Til profil
            </Link>
          }
        />
      ) : (
        <ValueFeed
          opportunities={opportunities}
          bookmakers={bookmakers}
          leagues={leagues}
          bankroll={stats.bankroll}
          favoriteLeagueIds={settings.favoriteLeagueIds}
          trackedBets={trackedBets}
          kellyFraction={settings.kellyFraction}
          stakeRounding={settings.stakeRounding}
        />
      )}
    </div>
  );
}
