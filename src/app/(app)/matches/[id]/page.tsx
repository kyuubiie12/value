import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, CalendarClock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormGuide } from "@/components/shared/form-guide";
import { LeagueBadge } from "@/components/shared/league-badge";
import { Metric } from "@/components/profile/parts";
import { OpportunityGrid } from "@/components/value-bets/opportunity-grid";
import { LineDataPanel } from "@/components/value-bets/value-detail-drawer";
import { loadFeedContext } from "@/lib/feed-context";
import { fixtureHref, groupFixtures } from "@/lib/fixtures";
import { formatCountdown, formatKickoff, formatPercent } from "@/lib/format";

export const metadata: Metadata = {
  title: "Kamp",
  description: "Alt vi ved om kampen: value bets, odds og baggrundsdata.",
};

export default async function MatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await loadFeedContext();

  // Prefer what the user can play; fall back to the full scan so a match page
  // still opens for a fixture none of their bookmakers prices.
  const playable = groupFixtures(ctx.opportunities).find((f) => f.id === id);
  const anyFixture = groupFixtures(ctx.all).find((f) => f.id === id);
  const fixture = playable ?? anyFixture;
  if (!fixture) notFound();

  const offBooks = !playable;
  const league = ctx.leagues.find((l) => l.id === fixture.leagueId);
  const sameLeague = groupFixtures(ctx.opportunities)
    .filter((f) => f.leagueId === fixture.leagueId && f.id !== fixture.id)
    .slice(0, 4);
  const withStats = fixture.opportunities.filter((o) => o.statContext);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] font-medium text-muted">
        <Link href="/value-bets" className="inline-flex items-center gap-1.5 transition-colors hover:text-fg">
          <ArrowLeft className="size-3.5" aria-hidden />
          Value Feed
        </Link>
        {league && (
          <Link href={`/leagues/${league.id}`} className="transition-colors hover:text-fg">
            {league.name}
          </Link>
        )}
      </div>

      <Card className="overflow-hidden">
        <CardContent className="flex flex-col gap-5 p-5 pt-5 sm:p-7">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12.5px] text-subtle">
            <Link href={`/leagues/${fixture.leagueId}`} className="transition-opacity hover:opacity-80">
              <LeagueBadge leagueId={fixture.leagueId} />
            </Link>
            <span className="inline-flex items-center gap-1.5">
              <CalendarClock className="size-3.5" aria-hidden />
              {formatKickoff(fixture.startsAt)}
            </span>
            <span className="tabular rounded-full bg-surface-3 px-2.5 py-0.5 text-[11.5px] text-muted">
              {formatCountdown(fixture.startsAt)}
            </span>
          </div>

          <h1 className="font-display text-[1.9rem] font-semibold leading-[1.08] tracking-tight text-fg sm:text-[2.6rem]">
            {fixture.homeTeam}
            <span className="font-normal text-subtle"> vs </span>
            {fixture.awayTeam}
          </h1>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <FormGuide form={fixture.homeForm} label={fixture.homeTeam.split(" ")[0]} />
            <FormGuide form={fixture.awayForm} label={fixture.awayTeam.split(" ")[0]} />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric
          label="Value bets på kampen"
          value={fixture.opportunities.length}
          tone="primary"
        />
        <Metric
          label="Bedste value"
          value={formatPercent(fixture.bestEdge / 100, { signed: true, digits: 1 })}
          tone="positive"
        />
        <Metric
          label="Markeder"
          value={new Set(fixture.opportunities.map((o) => o.marketLabel)).size}
        />
        <Metric
          label="Bookmakere med pris"
          value={new Set(fixture.opportunities.flatMap((o) => o.quotes.map((q) => q.bookmakerId))).size}
        />
      </div>

      {offBooks && (
        <p className="rounded-card border border-warning/30 bg-warning/[0.06] px-4 py-3 text-[12.5px] text-warning">
          Du har ikke konto hos de bookmakere, der prissætter denne kamp, så den vises ikke i dit
          feed. Tilføj flere bookmakere under Profil.
        </p>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="font-sans text-[15px] font-semibold tracking-tight text-fg">
          Value på kampen
        </h2>
        <OpportunityGrid
          opportunities={fixture.opportunities}
          bookmakers={ctx.bookmakers}
          leagues={ctx.leagues}
          bankroll={ctx.bankroll}
          trackedBets={ctx.trackedBets}
          kellyFraction={ctx.settings.kellyFraction}
          stakeRounding={ctx.settings.stakeRounding}
        />
      </section>

      {withStats.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-sans text-[15px] font-semibold tracking-tight text-fg">
            Data bag oddsene
          </h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {withStats.map((o) => (
              <div key={o.id} className="flex flex-col gap-2">
                <p className="text-[12.5px] text-muted">
                  <span className="font-medium text-fg">{o.selection}</span> · {o.marketLabel}
                </p>
                <LineDataPanel
                  s={o.statContext!}
                  homeTeam={o.homeTeam}
                  awayTeam={o.awayTeam}
                  selection={o.selection}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {sameLeague.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Flere kampe i {league?.name ?? "ligaen"}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col">
              {sameLeague.map((f) => (
                <li key={f.id} className="border-b border-line/50 last:border-0">
                  <Link
                    href={fixtureHref(f.opportunities[0])}
                    className="group flex items-center gap-3 py-3 outline-none"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-fg group-hover:text-primary-strong">
                        {f.homeTeam} vs {f.awayTeam}
                      </span>
                      <span className="text-[11.5px] text-subtle">{formatKickoff(f.startsAt)}</span>
                    </span>
                    <span className="tabular rounded-full bg-positive/10 px-2.5 py-0.5 text-[11.5px] font-semibold text-positive">
                      {formatPercent(f.bestEdge / 100, { signed: true, digits: 1 })}
                    </span>
                    <ArrowRight className="size-4 text-subtle transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
