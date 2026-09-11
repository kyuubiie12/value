"use client";

import { Check } from "lucide-react";
import type { ValueOpportunity } from "@/types";
import { formatKickoff, formatOdds } from "@/lib/format";
import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { EvIndicator } from "@/components/shared/ev-indicator";
import { LeagueBadge } from "@/components/shared/league-badge";
import { BookmakerLogo } from "@/components/shared/bookmaker-logo";
import type { TrackedBet } from "./value-feed";

export function ValueBetTable({
  opportunities,
  onOpen,
  trackedBets = {},
}: {
  opportunities: ValueOpportunity[];
  onOpen: (o: ValueOpportunity) => void;
  trackedBets?: Record<string, TrackedBet>;
}) {
  return (
    <TableWrap>
      <Table>
        <thead>
          <tr>
            <Th>Kamp</Th>
            <Th className="hidden sm:table-cell">Udfald</Th>
            <Th className="text-right">Bedste odds</Th>
            <Th className="text-right">Value</Th>
          </tr>
        </thead>
        <tbody>
          {opportunities.map((o) => {
            return (
              <Tr
                key={o.id}
                role="button"
                tabIndex={0}
                aria-label={`${o.homeTeam} mod ${o.awayTeam} — ${o.selection}, åbn analyse`}
                onClick={() => onOpen(o)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onOpen(o);
                  }
                }}
                className="cursor-pointer outline-none focus-visible:bg-surface-2/60 focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring/40"
              >
                <Td>
                  <p className="fixture-name text-[13px] font-medium text-fg">
                    {o.homeTeam} <span className="font-normal text-subtle">v</span>{" "}
                    {o.awayTeam}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <LeagueBadge leagueId={o.leagueId} />
                    <span className="text-[11px] text-subtle">
                      {formatKickoff(o.startsAt)}
                    </span>
                    {o.id in trackedBets && (
                      <span className="flex items-center gap-1 rounded-full bg-primary/12 px-1.5 py-0.5 text-[10px] font-medium text-primary-strong">
                        <Check className="size-3" strokeWidth={3} />
                        Spiller med
                      </span>
                    )}
                  </div>
                </Td>
                <Td className="hidden sm:table-cell">
                  <p className="text-[13px] text-fg">{o.selection}</p>
                  <p className="text-[11px] text-subtle">{o.marketLabel}</p>
                </Td>
                <Td className="text-right">
                  <span className="tabular text-[15px] font-semibold text-fg">
                    {formatOdds(o.bestOdds)}
                  </span>
                  <div className="mt-1 flex justify-end">
                    <BookmakerLogo bookmakerId={o.bestBookmakerId} size="sm" />
                  </div>
                </Td>
                <Td className="text-right">
                  <EvIndicator edge={o.expectedValue} size="md" />
                </Td>
              </Tr>
            );
          })}
        </tbody>
      </Table>
    </TableWrap>
  );
}
