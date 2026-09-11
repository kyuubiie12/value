import type { OddsQuote } from "@/types";
import { getBookmaker } from "@/lib/mock-data";
import { impliedProbability } from "@/lib/betting-math";
import { formatOdds, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { BookmakerLogo } from "@/components/shared/bookmaker-logo";

/** Full price comparison across every bookmaker that priced the selection. */
export function OddsBoard({
  quotes,
  bestBookmakerId,
  fairOdds,
}: {
  quotes: OddsQuote[];
  bestBookmakerId: string;
  fairOdds: number;
}) {
  const rows = [...quotes].sort((a, b) => b.price - a.price);

  return (
    <div className="overflow-hidden rounded-[var(--radius-sm)] border border-line">
      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 border-b border-line bg-surface-2 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.06em] text-subtle">
        <span>Bookmaker</span>
        <span className="text-right">Odds</span>
        <span className="text-right">Implied</span>
        <span className="text-right">vs fair</span>
      </div>
      {rows.map((q) => {
        const book = getBookmaker(q.bookmakerId);
        const isBest = q.bookmakerId === bestBookmakerId;
        const edge = q.price / fairOdds - 1;
        return (
          <div
            key={q.bookmakerId}
            className={cn(
              "grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 px-3 py-2 text-[13px]",
              isBest ? "bg-primary/10" : "odd:bg-surface/40",
            )}
          >
            <span className="flex min-w-0 items-center gap-2">
              <BookmakerLogo bookmakerId={q.bookmakerId} size="sm" />
              <span className="truncate text-[12px] text-muted">
                {book?.name ?? q.bookmakerId}
              </span>
              {book?.isSharp && (
                <span className="shrink-0 rounded-[3px] bg-surface-3 px-1 text-[8px] font-semibold uppercase text-subtle">
                  sharp
                </span>
              )}
            </span>
            <span
              className={cn(
                "tabular text-right font-semibold",
                isBest ? "text-primary-strong" : "text-fg",
              )}
            >
              {formatOdds(q.price)}
            </span>
            <span className="tabular text-right text-subtle">
              {formatPercent(impliedProbability(q.price), { digits: 1 })}
            </span>
            <span
              className={cn(
                "tabular text-right font-medium",
                edge > 0 ? "text-positive" : "text-subtle",
              )}
            >
              {formatPercent(edge, { signed: true, digits: 1 })}
            </span>
          </div>
        );
      })}
      <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 border-t border-line bg-surface-2/60 px-3 py-2 text-[12px]">
        <span className="text-subtle">Fair odds (de-vigget fra sharp)</span>
        <span className="tabular text-right font-semibold text-fg">
          {formatOdds(fairOdds)}
        </span>
        <span className="tabular text-right text-subtle">
          {formatPercent(1 / fairOdds, { digits: 1 })}
        </span>
        <span className="text-right text-subtle">—</span>
      </div>
    </div>
  );
}
