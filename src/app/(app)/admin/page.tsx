import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Metric } from "@/components/profile/parts";
import { BarList, SignupChart } from "@/components/admin/admin-bits";
import { UsersTable } from "@/components/admin/users-table";
import { getAdminOverview } from "@/lib/admin/queries";
import { bookmakerService, leagueService, valueService } from "@/lib/services";
import { MARKET_LABELS } from "@/types";
import { formatCurrency, formatPercent } from "@/lib/format";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

const hasStarted = (iso: string) => new Date(iso).getTime() <= Date.now();

export default async function AdminPage() {
  const [o, bookmakers, leagues, opps] = await Promise.all([
    getAdminOverview(),
    bookmakerService.list(),
    leagueService.list(),
    valueService.listOpportunities(),
  ]);
  // What the feed holds right now, per kind of bet — to see new markets filling in.
  const byMarket = new Map<string, number>();
  for (const x of opps) byMarket.set(x.market, (byMarket.get(x.market) ?? 0) + 1);
  const marketRows = [...byMarket]
    .map(([m, count]) => ({ label: MARKET_LABELS[m as keyof typeof MARKET_LABELS] ?? m, count }))
    .sort((a, b) => b.count - a.count);
  const signal = {
    starters: opps.filter((x) => x.lineup).length,
    referee: opps.filter((x) => x.referee).length,
    sharp: opps.filter((x) => x.sharpMove).length,
    moderate: opps.filter((x) => x.proofLevel === "moderate").length,
    high: opps.filter((x) => x.bestOdds > 5.5).length,
    live: opps.filter((x) => hasStarted(x.startsAt)).length,
  };
  const bookName = new Map(bookmakers.map((b) => [b.id, b.name]));
  const leagueName = new Map(leagues.map((l) => [l.id, l.name]));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Admin"
        description="Overblik over alle der har oprettet en konto, og hvordan de bruger appen."
        actions={
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-[11.5px] font-medium text-primary-strong">
            <ShieldCheck className="size-3.5" aria-hidden />
            Kun synlig for administratorer
          </span>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Brugere i alt" value={o.totalUsers} sub={`${o.new7d} nye de seneste 7 dage`} tone="primary" />
        <Metric label="Nye (30 dage)" value={o.new30d} />
        <Metric
          label="Logget ind (7 dage)"
          value={o.active7d}
          sub={`${o.activeNow} med aktiv session nu`}
        />
        <Metric
          label="Onboarding færdig"
          value={formatPercent(o.onboardedPct, { digits: 0 })}
          sub="af alle brugere"
        />
        <Metric
          label="Har logget et bet"
          value={formatPercent(o.withBetsPct, { digits: 0 })}
          sub="af alle brugere"
        />
        <Metric label="Bets i alt" value={o.totalBets} />
        <Metric label="Samlet indsats" value={formatCurrency(o.totalStaked, "DKK")} sub="på tværs af valutaer" />
        <Metric
          label="Planer"
          value={o.plans.map((p) => `${p.count} ${p.key}`).join(" · ") || "—"}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Spil i feedet lige nu</CardTitle>
          <CardDescription>
            {opps.length} spil i alt, fordelt på slags. Mål, assists og tacklinger fylder op, efterhånden som kampene prissættes.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <BarList rows={marketRows} empty="Ingen spil i feedet lige nu" />
          <div className="grid grid-cols-2 gap-3 border-t border-line pt-4 sm:grid-cols-3 lg:grid-cols-6">
            <Metric label="Med opstilling" value={signal.starters} />
            <Metric label="Med dommer" value={signal.referee} />
            <Metric label="Skarpt træk" value={signal.sharp} />
            <Metric label="Moderat bevis" value={signal.moderate} />
            <Metric label="Odds over 5,5" value={signal.high} />
            <Metric label="I gang nu" value={signal.live} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Nye brugere pr. dag</CardTitle>
          <CardDescription>De seneste 30 dage</CardDescription>
        </CardHeader>
        <CardContent>
          <SignupChart days={o.signupsByDay} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Mest valgte bookmakere</CardTitle>
            <CardDescription>Hvor mange brugere har bookmakeren aktiv</CardDescription>
          </CardHeader>
          <CardContent>
            <BarList
              rows={o.topBookmakers
                .slice(0, 6)
                .map((b) => ({ label: bookName.get(b.id) ?? b.id, count: b.count }))}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Mest valgte favoritligaer</CardTitle>
            <CardDescription>Hvor mange brugere har ligaen som favorit</CardDescription>
          </CardHeader>
          <CardContent>
            <BarList
              rows={o.topLeagues
                .slice(0, 6)
                .map((l) => ({ label: leagueName.get(l.id) ?? l.id, count: l.count }))}
              empty="Ingen har valgt favoritligaer endnu"
            />
          </CardContent>
        </Card>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-sans text-[15px] font-semibold tracking-tight text-fg">
          Alle brugere <span className="tabular text-subtle">({o.totalUsers})</span>
        </h2>
        <UsersTable users={o.users} />
        <p className="text-[11.5px] leading-relaxed text-subtle">
          Listen indeholder personoplysninger (navn og e-mail). Brug dem kun til at drive
          og forbedre tjenesten, og del dem ikke videre. Adgangskoder gemmes som hash og
          kan aldrig ses her.
        </p>
      </section>
    </div>
  );
}
