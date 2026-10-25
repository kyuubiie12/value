"use client";

import * as React from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import type {
  Bookmaker,
  League,
  MarketType,
  PriceMovement,
  ValueFilters,
  ValueSort,
} from "@/types";
import { MARKET_LABELS } from "@/types";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ToggleChip } from "@/components/ui/toggle-chip";
import { Segmented } from "@/components/ui/segmented";

export type FeedView = "cards" | "grouped" | "table";

const SORT_OPTIONS: { value: ValueSort; label: string }[] = [
  { value: "score-desc", label: "Bedste value score" },
  { value: "edge-desc", label: "Højeste EV" },
  { value: "kickoff-asc", label: "Tidligste kickoff" },
  { value: "odds-desc", label: "Højeste odds" },
  { value: "detected-desc", label: "Nyeste" },
];

const WINDOW_STEPS = [
  { value: "0", label: "Alle" },
  { value: "12", label: "12t" },
  { value: "24", label: "24t" },
  { value: "48", label: "48t" },
];

const MOVEMENT_STEPS = [
  { value: "", label: "Alle" },
  { value: "shortening", label: "Odds falder" },
  { value: "drifting", label: "Odds stiger" },
];

export function ValueFilterBar({
  filters,
  onChange,
  bookmakers,
  leagues,
  markets,
  resultCount,
  view,
  onViewChange,
}: {
  filters: ValueFilters;
  onChange: (next: ValueFilters) => void;
  bookmakers: Bookmaker[];
  leagues: League[];
  markets: MarketType[];
  resultCount: number;
  view: FeedView;
  onViewChange: (v: FeedView) => void;
}) {
  const [showMore, setShowMore] = React.useState(false);
  const patch = (p: Partial<ValueFilters>) => onChange({ ...filters, ...p });

  const toggle = <T,>(list: T[] | undefined, value: T): T[] => {
    const set = new Set(list ?? []);
    if (set.has(value)) set.delete(value);
    else set.add(value);
    return [...set];
  };

  const activeCount =
    (filters.leagueIds?.length ?? 0) +
    (filters.markets?.length ?? 0) +
    (filters.bookmakerIds?.length ?? 0) +
    (filters.movement ? 1 : 0) +
    (filters.withinHours ? 1 : 0) +
    (filters.search ? 1 : 0);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-3.5 -translate-y-1/2 text-subtle" />
          <Input
            value={filters.search ?? ""}
            onChange={(e) => patch({ search: e.target.value })}
            placeholder="Søg hold, liga eller udfald…"
            className="h-10 rounded-full pl-10"
            aria-label="Søg i value bets"
          />
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={filters.sort ?? "score-desc"}
            onChange={(e) => patch({ sort: e.target.value as ValueSort })}
            options={SORT_OPTIONS}
            aria-label="Sortér"
            className="h-10 w-[176px] rounded-full pl-4"
          />
          <button
            type="button"
            onClick={() => setShowMore((v) => !v)}
            aria-pressed={showMore}
            className="inline-flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-line/70 bg-surface-2 px-4 text-xs font-medium text-muted transition-colors hover:border-line-strong hover:text-fg"
          >
            <SlidersHorizontal className="size-3.5" />
            Filtre
            {activeCount > 0 && (
              <span className="tabular rounded-full bg-primary px-1 text-[10px] font-bold text-primary-contrast">
                {activeCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {showMore && (
        <div className="grid gap-5 rounded-card border border-line/60 bg-surface p-5 shadow-[var(--shadow-card)] sm:grid-cols-2">
          <FilterGroup label="Ligaer" className="sm:col-span-2">
            <div className="flex flex-wrap gap-1.5">
              {leagues.map((l) => (
                <ToggleChip
                  key={l.id}
                  active={filters.leagueIds?.includes(l.id)}
                  onClick={() =>
                    patch({ leagueIds: toggle(filters.leagueIds, l.id) })
                  }
                >
                  {l.name}
                </ToggleChip>
              ))}
            </div>
          </FilterGroup>
          <FilterGroup label="Kickoff inden for">
            <Segmented
              size="sm"
              value={String(filters.withinHours ?? 0)}
              onChange={(v) => patch({ withinHours: Number(v) || undefined })}
              options={WINDOW_STEPS}
            />
          </FilterGroup>
          <FilterGroup label="Odds-bevægelse">
            <Segmented
              size="sm"
              value={filters.movement ?? ""}
              onChange={(v) =>
                patch({ movement: (v || undefined) as PriceMovement | undefined })
              }
              options={MOVEMENT_STEPS}
            />
          </FilterGroup>
          <FilterGroup label="Markeder" className="sm:col-span-2">
            <div className="flex flex-wrap gap-1.5">
              {markets.map((m) => (
                <ToggleChip
                  key={m}
                  active={filters.markets?.includes(m)}
                  onClick={() => patch({ markets: toggle(filters.markets, m) })}
                >
                  {MARKET_LABELS[m]}
                </ToggleChip>
              ))}
            </div>
          </FilterGroup>
          <FilterGroup label="Bookmakere" className="sm:col-span-2">
            <div className="flex flex-wrap gap-1.5">
              {bookmakers.map((b) => (
                <ToggleChip
                  key={b.id}
                  active={filters.bookmakerIds?.includes(b.id)}
                  onClick={() =>
                    patch({ bookmakerIds: toggle(filters.bookmakerIds, b.id) })
                  }
                >
                  {b.name}
                </ToggleChip>
              ))}
            </div>
          </FilterGroup>
        </div>
      )}

      {activeCount > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {(filters.leagueIds ?? []).map((id) => (
            <ActiveChip
              key={`l-${id}`}
              onRemove={() =>
                patch({ leagueIds: toggle(filters.leagueIds, id) })
              }
            >
              {leagues.find((l) => l.id === id)?.name ?? id}
            </ActiveChip>
          ))}
          {(filters.markets ?? []).map((m) => (
            <ActiveChip
              key={`m-${m}`}
              onRemove={() => patch({ markets: toggle(filters.markets, m) })}
            >
              {MARKET_LABELS[m]}
            </ActiveChip>
          ))}
          {(filters.bookmakerIds ?? []).map((id) => (
            <ActiveChip
              key={`b-${id}`}
              onRemove={() =>
                patch({ bookmakerIds: toggle(filters.bookmakerIds, id) })
              }
            >
              {bookmakers.find((b) => b.id === id)?.name ?? id}
            </ActiveChip>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-[11px] text-subtle">
          <span className="relative flex size-1.5" aria-hidden>
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/70" />
            <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
          </span>
          <span className="tabular">
            {resultCount} {resultCount === 1 ? "value bet" : "value bets"} · scanner
            kører
          </span>
          {activeCount > 0 && (
            <button
              type="button"
              onClick={() => onChange({ sort: filters.sort })}
              className="inline-flex cursor-pointer items-center gap-1 font-medium text-muted transition-colors hover:text-fg"
            >
              <X className="size-3" />
              Ryd
            </button>
          )}
        </span>
        <Segmented<FeedView>
          size="sm"
          value={view}
          onChange={onViewChange}
          options={[
            { value: "cards", label: "Liste" },
            { value: "grouped", label: "Ligaer" },
            { value: "table", label: "Tabel" },
          ]}
        />
      </div>
    </div>
  );
}

function ActiveChip({
  children,
  onRemove,
}: {
  children: string;
  onRemove: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onRemove}
      aria-label={`Fjern filter: ${children}`}
      className="group inline-flex cursor-pointer items-center gap-1 rounded-full bg-primary/12 py-0.5 pl-2.5 pr-1.5 text-[11px] font-medium text-primary-strong transition-colors hover:bg-primary/20"
    >
      {children}
      <X className="size-3 text-primary-strong/60 transition-colors group-hover:text-primary-strong" aria-hidden />
    </button>
  );
}

function FilterGroup({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.08em] text-subtle">
        {label}
      </span>
      {children}
    </div>
  );
}
