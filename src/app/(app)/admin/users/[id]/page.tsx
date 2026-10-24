import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { BetStatusBadge } from "@/components/shared/bet-status-badge";
import { Metric } from "@/components/profile/parts";
import { getAdminUser } from "@/lib/admin/queries";
import { bookmakerService, leagueService } from "@/lib/services";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatOdds,
  formatPercent,
  formatRelativeTime,
} from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Admin · Bruger",
  robots: { index: false, follow: false },
};

export default async function AdminUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [detail, bookmakers, leagues] = await Promise.all([
    getAdminUser(id),
    bookmakerService.list(),
    leagueService.list(),
  ]);
  if (!detail) notFound();

  const { row, settings: s, bets } = detail;
  const bookName = new Map(bookmakers.map((b) => [b.id, b.name]));
  const leagueName = new Map(leagues.map((l) => [l.id, l.name]));
  const roi = row.staked > 0 ? row.profit / row.staked : 0;

  const prefs: [string, string][] = [
    ["Startkapital", formatCurrency(s.startingBankroll, s.currency)],
    ["Kelly-fraktion", `${s.kellyFraction}×`],
    ["Auto-følg", s.autoFollow ? `Til (over ${formatPercent(s.autoFollowMinEdge, { digits: 1 })})` : "Fra"],
    ["Min. EV i feed", formatPercent(s.minEdge, { digits: 1 })],
    ["Ugentlig grænse", s.weeklyStakeLimit > 0 ? formatCurrency(s.weeklyStakeLimit, s.currency) : "Ingen"],
    ["Tidszone", s.timezone],
    ["Tema", `${s.theme} · ${s.accent}`],
    [
      "Notifikationer",
      [
        s.valueAlerts && "value",
        s.priceMoveAlerts && "odds",
        s.betResultAlerts && "resultater",
        s.weeklyReport && "ugerapport",
      ]
        .filter(Boolean)
        .join(", ") || "Ingen",
    ],
  ];

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/admin"
        className="inline-flex w-fit items-center gap-1.5 text-[12.5px] font-medium text-muted transition-colors hover:text-fg"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        Alle brugere
      </Link>

      <PageHeader
        title={row.name}
        description={row.email}
        actions={
          <>
            {!row.onboarded && <Badge tone="warning">Onboarding ikke færdig</Badge>}
            {row.plan === "pro" && <Badge tone="primary">Pro</Badge>}
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Oprettet" value={formatDate(row.createdAt)} />
        <Metric
          label="Sidst logget ind"
          value={row.lastSeenAt ? formatRelativeTime(row.lastSeenAt) : "—"}
          sub={row.activeSessions > 0 ? `${row.activeSessions} aktiv session` : "Ingen aktive sessioner"}
        />
        <Metric label="Bets" value={row.bets} sub={`${row.openBets} åbne`} />
        <Metric
          label="Resultat"
          value={row.bets ? formatCurrency(row.profit, row.currency) : "—"}
          tone={row.bets === 0 ? "neutral" : row.profit >= 0 ? "positive" : "negative"}
          sub={row.bets ? `ROI ${formatPercent(roi, { signed: true, digits: 1 })}` : undefined}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <Card>
          <CardHeader>
            <CardTitle>Indstillinger</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="flex flex-col">
              {prefs.map(([k, v]) => (
                <div
                  key={k}
                  className="flex items-start justify-between gap-4 border-b border-line/50 py-2.5 text-[12.5px] last:border-0"
                >
                  <dt className="text-subtle">{k}</dt>
                  <dd className="text-right text-fg">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-4 flex flex-col gap-3">
              <div>
                <p className="mb-1.5 text-[11.5px] text-subtle">Bookmakere ({s.activeBookmakerIds.length})</p>
                <div className="flex flex-wrap gap-1.5">
                  {s.activeBookmakerIds.length ? (
                    s.activeBookmakerIds.map((b) => (
                      <Badge key={b}>{bookName.get(b) ?? b}</Badge>
                    ))
                  ) : (
                    <span className="text-[12.5px] text-subtle">Ingen valgt</span>
                  )}
                </div>
              </div>
              <div>
                <p className="mb-1.5 text-[11.5px] text-subtle">Favoritligaer ({s.favoriteLeagueIds.length})</p>
                <div className="flex flex-wrap gap-1.5">
                  {s.favoriteLeagueIds.length ? (
                    s.favoriteLeagueIds.map((l) => (
                      <Badge key={l}>{leagueName.get(l) ?? l}</Badge>
                    ))
                  ) : (
                    <span className="text-[12.5px] text-subtle">Ingen valgt</span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Seneste bets {bets.length >= 100 && <span className="text-subtle">(100 nyeste)</span>}</CardTitle>
          </CardHeader>
          <CardContent>
            {bets.length === 0 ? (
              <p className="py-6 text-center text-[13px] text-subtle">
                Brugeren har ikke logget nogen bets endnu.
              </p>
            ) : (
              <TableWrap className="shadow-none">
                <Table>
                  <thead>
                    <tr>
                      <Th>Dato</Th>
                      <Th>Kamp</Th>
                      <Th className="text-right">Odds</Th>
                      <Th className="text-right">Indsats</Th>
                      <Th>Status</Th>
                      <Th className="text-right">Resultat</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {bets.map((b) => (
                      <Tr key={b.id}>
                        <Td className="text-muted">{formatDateTime(b.placedAt)}</Td>
                        <Td>
                          <span className="block text-[13px] text-fg">{b.event}</span>
                          <span className="block text-[11.5px] text-subtle">{b.selection}</span>
                        </Td>
                        <Td className="tabular text-right">{formatOdds(b.odds)}</Td>
                        <Td className="tabular text-right text-muted">
                          {formatCurrency(b.stake, row.currency)}
                        </Td>
                        <Td>
                          <BetStatusBadge status={b.status} />
                        </Td>
                        <Td
                          className={cn(
                            "tabular text-right font-medium",
                            b.status === "pending"
                              ? "text-subtle"
                              : b.profit >= 0
                                ? "text-positive"
                                : "text-negative",
                          )}
                        >
                          {b.status === "pending" ? "—" : formatCurrency(b.profit, row.currency)}
                        </Td>
                      </Tr>
                    ))}
                  </tbody>
                </Table>
              </TableWrap>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
