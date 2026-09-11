"use client";

import * as React from "react";
import { Search, Inbox } from "lucide-react";
import type { Bet, BetFilters, BetSort, BetStatus, Currency } from "@/types";
import { BET_STATUS_LABELS } from "@/types";
import { getLeague } from "@/lib/mock-data";
import { filterBets } from "@/lib/filtering";
import {
  formatCurrency,
  formatDate,
  formatOdds,
  formatSignedCurrency,
  formatUnits,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ToggleChip } from "@/components/ui/toggle-chip";
import { EmptyState } from "@/components/shared/empty-state";
import { BookmakerLogo } from "@/components/shared/bookmaker-logo";
import { BetStatusBadge } from "@/components/shared/bet-status-badge";
import { LeagueCode } from "@/components/shared/league-badge";
import { BetDetailModal } from "./bet-detail-modal";

const STATUS_FILTERS: BetStatus[] = ["pending", "won", "lost", "cashout", "void"];

const SORT_OPTIONS: { value: BetSort; label: string }[] = [
  { value: "placed-desc", label: "Nyeste først" },
  { value: "placed-asc", label: "Ældste først" },
  { value: "profit-desc", label: "Størst profit" },
  { value: "profit-asc", label: "Størst tab" },
  { value: "stake-desc", label: "Største indsats" },
  { value: "odds-desc", label: "Højeste odds" },
];

export function BetHistoryTable({
  bets,
  currency,
}: {
  bets: Bet[];
  currency: Currency;
}) {
  const [filters, setFilters] = React.useState<BetFilters>({ sort: "placed-desc" });
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const selected = React.useMemo(
    () => bets.find((b) => b.id === selectedId) ?? null,
    [bets, selectedId],
  );

  const leagueIds = React.useMemo(
    () => [...new Set(bets.map((b) => b.leagueId))],
    [bets],
  );
  const rows = React.useMemo(() => filterBets(bets, filters), [bets, filters]);
  const patch = (p: Partial<BetFilters>) => setFilters((f) => ({ ...f, ...p }));

  const toggleStatus = (s: BetStatus) => {
    const set = new Set(filters.statuses ?? []);
    if (set.has(s)) set.delete(s);
    else set.add(s);
    patch({ statuses: [...set] });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-subtle" />
          <Input
            value={filters.search ?? ""}
            onChange={(e) => patch({ search: e.target.value })}
            placeholder="Søg kamp, liga eller udfald…"
            className="pl-[34px]"
            aria-label="Søg i spilhistorik"
          />
        </div>
        <Select
          value={filters.sort ?? "placed-desc"}
          onChange={(e) => patch({ sort: e.target.value as BetSort })}
          options={SORT_OPTIONS}
          aria-label="Sortér spilhistorik"
          className="lg:w-48"
        />
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {STATUS_FILTERS.map((s) => (
          <ToggleChip
            key={s}
            active={filters.statuses?.includes(s)}
            onClick={() => toggleStatus(s)}
          >
            {BET_STATUS_LABELS[s]}
          </ToggleChip>
        ))}
        {leagueIds.length > 1 && (
          <span className="mx-1 h-4 w-px bg-line" />
        )}
        {leagueIds.length > 1 &&
          leagueIds.map((id) => {
            const league = getLeague(id);
            return (
              <ToggleChip
                key={id}
                active={filters.leagueIds?.includes(id)}
                onClick={() => {
                  const set = new Set(filters.leagueIds ?? []);
                  if (set.has(id)) set.delete(id);
                  else set.add(id);
                  patch({ leagueIds: [...set] });
                }}
              >
                {league?.name ?? id}
              </ToggleChip>
            );
          })}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="Ingen bets matcher"
          description="Justér dine filtre for at se flere spil."
        />
      ) : (
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <Th>Dato</Th>
                <Th>Kamp</Th>
                <Th>Væddemål</Th>
                <Th>Bookmaker</Th>
                <Th className="text-right">Odds</Th>
                <Th className="text-right">Indsats</Th>
                <Th>Status</Th>
                <Th className="text-right">Profit</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => (
                <Tr
                  key={b.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`${b.event} — ${b.selection}, se detaljer`}
                  onClick={() => setSelectedId(b.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedId(b.id);
                    }
                  }}
                  className="cursor-pointer outline-none focus-visible:bg-surface-2/60 focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring/40"
                >
                  <Td className="text-[11px] text-muted">{formatDate(b.placedAt)}</Td>
                  <Td>
                    <p className="fixture-name text-[13px] text-fg">{b.event}</p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-subtle">
                      <LeagueCode
                        code={getLeague(b.leagueId)?.shortName ?? "?"}
                        accent={getLeague(b.leagueId)?.accent}
                      />
                      {b.league}
                      {b.tags?.includes("auto-follow") && (
                        <span className="shrink-0 rounded-full bg-primary/15 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-primary-strong">
                          Auto
                        </span>
                      )}
                    </p>
                  </Td>
                  <Td>
                    <p className="text-[11px] text-subtle">{b.marketLabel}</p>
                    <p className="text-[13px] text-fg">{b.selection}</p>
                  </Td>
                  <Td>
                    <BookmakerLogo bookmakerId={b.bookmakerId} size="sm" />
                  </Td>
                  <Td className="text-right tabular text-fg">{formatOdds(b.odds)}</Td>
                  <Td className="text-right">
                    <span className="tabular text-fg">
                      {formatCurrency(b.stake, currency)}
                    </span>
                    <span className="ml-1.5 text-[11px] text-subtle">
                      {formatUnits(b.stakeUnits)}
                    </span>
                  </Td>
                  <Td>
                    <BetStatusBadge status={b.status} />
                  </Td>
                  <Td className="text-right">
                    <span
                      className={cn(
                        "tabular font-semibold",
                        b.status === "pending"
                          ? "text-subtle"
                          : b.profit > 0
                            ? "text-positive"
                            : b.profit < 0
                              ? "text-negative"
                              : "text-muted",
                      )}
                    >
                      {b.status === "pending"
                        ? "–"
                        : formatSignedCurrency(b.profit, currency)}
                    </span>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </TableWrap>
      )}

      <p className="text-[11px] text-subtle">
        Viser {rows.length} af {bets.length} bets
      </p>

      <BetDetailModal
        bet={selected}
        currency={currency}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}
