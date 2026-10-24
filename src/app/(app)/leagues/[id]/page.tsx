import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LeagueCode } from "@/components/shared/league-badge";
import { Metric } from "@/components/profile/parts";
import { FavoriteButton } from "@/components/leagues/favorite-button";
import { OpportunityGrid } from "@/components/value-bets/opportunity-grid";
import { loadFeedContext } from "@/lib/feed-context";
import { fixtureHref, groupFixtures } from "@/lib/fixtures";
import { formatCountdown, formatKickoff, formatPercent } from "@/lib/format";
import { trackRecordService } from "@/lib/services";

export const metadata: Metadata = {
  title: "Liga",
  description: "Value bets, kampe og track record for ligaen.",
};

const TIER: Record<number, string> = {
  0: "Europæisk turnering",
  1: "Topdivision",
  2: "2. division",
};

export default async function LeaguePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [ctx, breakdown] = await Promise.all([
    loadFeedContext(),
    trackRecordService.getBreakdown("league"),
  ]);
  const league = ctx.leagues.find((l) => l.id === id);
  if (!league) notFound();

  const opps = ctx.opportunities.filter((o) => o.leagueId === id);
  const fixtures = groupFixtures(opps);
  const track = breakdown.find((r) => r.key === id || r.label === league.name);
  const avgEv = opps.length ? opps.reduce((a, o) => a + o.expectedValue, 0) / opps.length : 0;
  const best = opps.length ? Math.max(...opps.map((o) => o.edgePercent)) : 0;

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/leagues"
        className="inline-flex w-fit items-center gap-1.5 text-[12.5px] font-medium text-muted transition-colors hover:text-fg"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        Alle ligaer
      </Link>

      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <LeagueCode
            code={league.shortName}
            accent={league.accent}
            className="h-7 min-w-[44px] px-2.5 text-[12px]"
          />
          <div>
            <h1 className="font-display text-[1.6rem] font-semibold leading-tight tracking-tight text-fg sm:text-[2rem]">
              {league.name}
            </h1>
            <p className="mt-0.5 text-[13px] text-muted">
              {league.country} · {TIER[league.tier] ?? "Liga"}
            </p>
          </div>
        </div>
        <FavoriteButton leagueId={league.id} initial={ctx.settings.favoriteLeagueIds.includes(league.id)} />
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Value bets nu" value={opps.length} tone="primary" />
        <Metric label="Kommende kampe" value={fixtures.length} />
        <Metric
          label="Bedste value"
          value={opps.length ? formatPercent(best / 100, { signed: true, digits: 1 }) : "—"}
          tone={opps.length ? "positive" : "neutral"}
        />
        <Metric
          label="Gns. value"
          value={opps.length ? formatPercent(avgEv, { signed: true, digits: 1 }) : "—"}
        />
      </div>

      {fixtures.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Kampe</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col">
              {fixtures.map((f) => (
                <li key={f.id} className="border-b border-line/50 last:border-0">
                  <Link
                    href={fixtureHref(f.opportunities[0])}
                    className="group flex items-center gap-3 py-3.5 outline-none"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-medium text-fg group-hover:text-primary-strong">
                        {f.homeTeam} vs {f.awayTeam}
                      </span>
                      <span className="text-[11.5px] text-subtle">
                        {formatKickoff(f.startsAt)} · {formatCountdown(f.startsAt)} ·{" "}
                        {f.opportunities.length} {f.opportunities.length === 1 ? "value bet" : "value bets"}
                      </span>
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
      ) : (
        <p className="rounded-card border border-line/60 bg-surface-2/40 px-4 py-6 text-center text-[13px] text-subtle">
          Ingen value bets i {league.name} hos dine bookmakere lige nu.
        </p>
      )}

      {opps.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-sans text-[15px] font-semibold tracking-tight text-fg">
            Value bets i ligaen
          </h2>
          <OpportunityGrid
            opportunities={opps}
            bookmakers={ctx.bookmakers}
            leagues={ctx.leagues}
            bankroll={ctx.bankroll}
            trackedBets={ctx.trackedBets}
            kellyFraction={ctx.settings.kellyFraction}
            stakeRounding={ctx.settings.stakeRounding}
          />
        </section>
      )}

      {track && track.picks > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>AI&apos;ens track record i {league.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Metric label="Picks" value={track.picks} />
              <Metric
                label="Afkast (ROI)"
                value={formatPercent(track.roi, { signed: true, digits: 1 })}
                tone={track.roi >= 0 ? "positive" : "negative"}
              />
              <Metric label="Hit rate" value={formatPercent(track.hitRate, { digits: 0 })} />
              <Metric
                label="Gns. CLV"
                value={formatPercent(track.avgClv, { signed: true, digits: 1 })}
                tone={track.avgClv >= 0 ? "positive" : "negative"}
              />
            </div>
            <p className="mt-3 text-[11.5px] text-subtle">
              Alle opslåede picks i ligaen, gradueret mod slutodds.{" "}
              <Link href="/results" className="text-primary-strong hover:underline">
                Se hele track recordet
              </Link>
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
