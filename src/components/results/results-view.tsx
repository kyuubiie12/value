"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Bell,
  CalendarDays,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import type {
  SettledPick,
  TrackBreakdownDimension,
  TrackBreakdownRow,
  TrackRecordPoint,
  TrackRecordStats,
} from "@/types";
import { formatDate, formatOdds, formatPercent } from "@/lib/format";
import { getLeague } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { LeagueCode } from "@/components/shared/league-badge";
import { BookmakerLogo } from "@/components/shared/bookmaker-logo";
import { TrackEquityChart } from "./track-equity-chart";

const DIMS: { value: TrackBreakdownDimension; label: string }[] = [
  { value: "market", label: "Marked" },
  { value: "league", label: "Liga" },
  { value: "edge", label: "EV" },
  { value: "month", label: "Måned" },
];

export function ResultsView({
  stats,
  equity,
  picks,
  breakdowns,
}: {
  stats: TrackRecordStats;
  equity: TrackRecordPoint[];
  picks: SettledPick[];
  breakdowns: Record<TrackBreakdownDimension, TrackBreakdownRow[]>;
}) {
  const [dim, setDim] = React.useState<TrackBreakdownDimension>("market");
  const [q, setQ] = React.useState("");
  const [resultFilter, setResultFilter] = React.useState<"all" | "won" | "lost">(
    "all",
  );
  const [limit, setLimit] = React.useState(25);

  const rows = breakdowns[dim] ?? [];
  const maxAbs = Math.max(1, ...rows.map((r) => Math.abs(r.profitUnits)));

  const filtered = React.useMemo(() => {
    const term = q.trim().toLowerCase();
    return picks.filter((p) => {
      if (resultFilter === "won" && p.profitUnits <= 0) return false;
      if (resultFilter === "lost" && p.profitUnits >= 0) return false;
      if (
        term &&
        !`${p.homeTeam} ${p.awayTeam} ${p.league} ${p.selection}`
          .toLowerCase()
          .includes(term)
      )
        return false;
      return true;
    });
  }, [picks, q, resultFilter]);

  return (
    <div className="flex flex-col gap-6">
      {/* Trust hero */}
      <div className="relative overflow-hidden rounded-card-lg border border-primary/25 bg-surface">
        <div className="pointer-events-none absolute -right-16 -top-24 size-64 rounded-full bg-primary/12 blur-3xl" />
        <div className="relative flex flex-col gap-1 p-5">
          <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-primary-strong">
            <ShieldCheck className="size-3.5" />
            Verificeret track record · siden {formatDate(stats.since)}
          </p>
          <p className="max-w-2xl text-[13px] leading-relaxed text-muted">
            Hvis du havde fulgt <span className="text-fg">hver eneste</span> value
            bet AI&apos;en har lagt op — med den anbefalede indsats — så ville du
            stå her nu:
          </p>
        </div>
        <div className="relative grid grid-cols-2 border-t border-line md:grid-cols-4">
          <BigStat
            label="Afkast (yield)"
            value={formatPercent(stats.roi, { signed: true })}
            tone={stats.roi >= 0 ? "positive" : "negative"}
            sub={`${stats.profitUnits > 0 ? "+" : ""}${stats.profitUnits} units profit`}
          />
          <BigStat
            label="Gns. CLV"
            value={formatPercent(stats.avgClv, { signed: true })}
            tone={stats.avgClv >= 0 ? "positive" : "negative"}
            sub={`${formatPercent(stats.clvBeatRate, { digits: 0 })} slår slutodds`}
            highlight
          />
          <BigStat
            label="Hit rate"
            value={formatPercent(stats.hitRate)}
            sub={`${stats.wonPicks}V / ${stats.lostPicks}T`}
          />
          <BigStat
            label="Picks"
            value={String(stats.picks)}
            sub={`Ø ${formatOdds(stats.avgOdds)} · Ø +${stats.avgEdge}% EV`}
          />
        </div>
      </div>

      {/* Follow CTA */}
      <div className="flex flex-col gap-3 rounded-card border border-primary/25 bg-primary/[0.05] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-[var(--radius-sm)] bg-primary/15 text-primary-strong">
            <Sparkles className="size-4" />
          </span>
          <div>
            <p className="text-[13px] font-semibold text-fg">
              Vil du følge de her picks?
            </p>
            <p className="mt-0.5 max-w-md text-[12px] leading-relaxed text-muted">
              Slå auto-følg til, så lander hvert nyt value bet over din
              EV-grænse i din portefølje — eller få bare en besked.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-stretch">
          <Link
            href="/profile?s=feed"
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[var(--radius-sm)] bg-primary px-4 text-[13px] font-medium text-primary-contrast transition-colors hover:bg-primary-strong"
          >
            Slå auto-følg til
            <ArrowRight className="size-3.5" />
          </Link>
          <Link
            href="/profile?s=notifikationer"
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[var(--radius-sm)] border border-line bg-surface-2 px-4 text-[12px] font-medium text-muted transition-colors hover:border-line-strong hover:text-fg"
          >
            <Bell className="size-3.5" />
            Kun besked
          </Link>
        </div>
      </div>

      {/* Equity + breakdown */}
      <div className="grid grid-cols-1 gap-3.5 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader>
            <CardTitle>Kurve</CardTitle>
            <CardDescription>
              Akkumuleret profit ved at følge alle picks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TrackEquityChart data={equity} />
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Fordeling</CardTitle>
              <CardDescription>Resultat pr. dimension</CardDescription>
            </div>
            <Segmented<TrackBreakdownDimension>
              size="sm"
              value={dim}
              onChange={setDim}
              options={DIMS}
            />
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {rows.map((r) => {
              const pos = r.profitUnits >= 0;
              const width = (Math.abs(r.profitUnits) / maxAbs) * 100;
              return (
                <div key={r.key} className="grid grid-cols-[1fr_auto] items-center gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="truncate font-medium text-fg">{r.label}</span>
                      <span className="shrink-0 text-[11px] text-subtle">
                        {r.picks} · CLV {formatPercent(r.avgClv, { signed: true, digits: 1 })}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-surface-2">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          pos ? "bg-positive/80" : "bg-negative/80",
                        )}
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={cn(
                        "tabular text-[13px] font-semibold",
                        pos ? "text-positive" : "text-negative",
                      )}
                    >
                      {pos ? "+" : ""}
                      {r.profitUnits}u
                    </p>
                    <p className="tabular text-[10px] text-subtle">
                      {formatPercent(r.roi, { signed: true })}
                    </p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Picks log */}
      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold tracking-tight text-fg">
            Alle picks
          </h2>
          <span className="text-[11px] text-subtle">
            Opdateret {formatDate(stats.updatedAt)}
          </span>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-subtle" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Søg hold, liga eller udfald…"
              className="pl-[34px]"
              aria-label="Søg i picks"
            />
          </div>
          <Segmented
            value={resultFilter}
            onChange={(v) => setResultFilter(v as typeof resultFilter)}
            options={[
              { value: "all", label: "Alle" },
              { value: "won", label: "Vundet" },
              { value: "lost", label: "Tabt" },
            ]}
          />
        </div>

        <TableWrap>
          <Table>
            <thead>
              <tr>
                <Th>Dato</Th>
                <Th>Kamp</Th>
                <Th>Udfald</Th>
                <Th className="text-right">Odds</Th>
                <Th className="text-right">Slut</Th>
                <Th className="text-right">CLV</Th>
                <Th className="text-right">Resultat</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, limit).map((p) => {
                const league = getLeague(p.leagueId);
                const pos = p.profitUnits > 0;
                const push = p.result === "void";
                return (
                  <Tr key={p.id}>
                    <Td className="text-[11px] text-muted">
                      {formatDate(p.settledAt)}
                    </Td>
                    <Td>
                      <p className="fixture-name text-[13px] text-fg">
                        {p.homeTeam} <span className="text-subtle">v</span>{" "}
                        {p.awayTeam}
                      </p>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <LeagueCode
                          code={league?.shortName ?? "?"}
                          accent={league?.accent}
                        />
                        <span className="text-[11px] text-subtle">{p.marketLabel}</span>
                      </div>
                    </Td>
                    <Td>
                      <p className="text-[13px] text-fg">{p.selection}</p>
                      <div className="mt-0.5">
                        <BookmakerLogo bookmakerId={p.bookmakerId} size="sm" />
                      </div>
                    </Td>
                    <Td className="text-right tabular text-fg">
                      {formatOdds(p.postedOdds)}
                    </Td>
                    <Td className="text-right tabular text-subtle">
                      {formatOdds(p.closingOdds)}
                    </Td>
                    <Td
                      className={cn(
                        "text-right tabular font-medium",
                        p.clvPercent > 0 ? "text-positive" : "text-negative",
                      )}
                    >
                      {p.clvPercent > 0 ? "+" : ""}
                      {p.clvPercent.toFixed(1)}%
                    </Td>
                    <Td className="text-right">
                      <span
                        className={cn(
                          "tabular text-[13px] font-semibold",
                          push
                            ? "text-subtle"
                            : pos
                              ? "text-positive"
                              : "text-negative",
                        )}
                      >
                        {push
                          ? "Void"
                          : `${p.profitUnits > 0 ? "+" : ""}${p.profitUnits}u`}
                      </span>
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        </TableWrap>

        <div className="flex items-center justify-between text-[11px] text-subtle">
          <span>
            Viser {Math.min(limit, filtered.length)} af {filtered.length}
          </span>
          {limit < filtered.length && (
            <button
              type="button"
              onClick={() => setLimit((l) => l + 25)}
              className="rounded-[var(--radius-sm)] border border-line bg-surface-2 px-2.5 py-1 font-medium text-muted transition-colors hover:border-line-strong hover:text-fg"
            >
              Vis flere
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

function BigStat({
  label,
  value,
  sub,
  tone = "neutral",
  highlight = false,
}: {
  label: string;
  value: string;
  sub: string;
  tone?: "neutral" | "positive" | "negative";
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "border-l border-line px-4 py-4 first:border-l-0 md:first:border-l",
        highlight && "bg-primary/[0.05]",
      )}
    >
      <p className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-subtle">
        {label === "Gns. CLV" && <Target className="size-3" />}
        {label === "Afkast (yield)" && <TrendingUp className="size-3" />}
        {label === "Picks" && <CalendarDays className="size-3" />}
        {label}
      </p>
      <p
        className={cn(
          "tabular mt-1.5 text-xl font-bold",
          tone === "positive" && "text-positive",
          tone === "negative" && "text-negative",
          tone === "neutral" && "text-fg",
        )}
      >
        {value}
      </p>
      <p className="mt-0.5 text-[11px] text-subtle">{sub}</p>
    </div>
  );
}
