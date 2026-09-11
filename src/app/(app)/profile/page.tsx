import type { Metadata } from "next";
import type { Bet } from "@/types";
import { PageHeader } from "@/components/shared/page-header";
import { ProfileView } from "@/components/profile/profile-view";
import {
  bookmakerService,
  leagueService,
  portfolioService,
  settingsService,
} from "@/lib/services";

/** Total stake across bets placed within the last `windowMs`. */
function sumStakeSince(bets: Bet[], windowMs: number): number {
  const cutoff = Date.now() - windowMs;
  return bets
    .filter((b) => new Date(b.placedAt).getTime() >= cutoff)
    .reduce((sum, b) => sum + b.stake, 0);
}

export const metadata: Metadata = {
  title: "Profil",
  description:
    "Din profil — bankroll, units, hvilke bookmakere du spiller hos, og hvordan din udvikling ser ud.",
};

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ s?: string }>;
}) {
  const { s } = await searchParams;
  const [settings, bookmakers, leagues, stats, equity, bets] = await Promise.all([
    settingsService.get(),
    bookmakerService.list(),
    leagueService.list(),
    portfolioService.getStats(),
    portfolioService.getEquityCurve(),
    portfolioService.listBets(),
  ]);

  const stakedThisWeek = sumStakeSince(bets, 7 * 86_400_000);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <PageHeader
        title="Profil"
        description="Din konto, bankroll, bookmakere og indstillinger — alt der styrer feedet og din tracking."
      />
      <ProfileView
        settings={settings}
        bookmakers={bookmakers}
        leagues={leagues}
        stats={stats}
        bankrollHistory={equity.map((p) => p.bankroll)}
        stakedThisWeek={Math.round(stakedThisWeek)}
        initialSection={s}
      />
    </div>
  );
}
