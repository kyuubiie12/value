import type { Metadata } from "next";
import Link from "next/link";
import { Star } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { LeagueCode } from "@/components/shared/league-badge";
import { loadFeedContext } from "@/lib/feed-context";
import { formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Ligaer",
  description: "Alle ligaer vi følger — og hvor der er value lige nu.",
};

export default async function LeaguesPage() {
  const ctx = await loadFeedContext();
  const fav = new Set(ctx.settings.favoriteLeagueIds);

  const rows = ctx.leagues
    .map((l) => {
      const opps = ctx.opportunities.filter((o) => o.leagueId === l.id);
      return {
        league: l,
        count: opps.length,
        best: opps.length ? Math.max(...opps.map((o) => o.edgePercent)) : 0,
      };
    })
    .sort(
      (a, b) =>
        Number(fav.has(b.league.id)) - Number(fav.has(a.league.id)) ||
        b.count - a.count ||
        a.league.name.localeCompare(b.league.name, "da"),
    );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Ligaer"
        description="De turneringer AI'en scanner. Dine favoritter ligger øverst — vælg dem med stjernen på ligaens side."
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map(({ league: l, count, best }) => (
          <Link
            key={l.id}
            href={`/leagues/${l.id}`}
            className={cn(
              "spot group flex items-center gap-3.5 rounded-card border bg-surface p-4 shadow-[var(--shadow-card)] outline-none transition-colors",
              "focus-visible:ring-2 focus-visible:ring-ring/40",
              fav.has(l.id) ? "border-primary/35" : "border-line/60",
            )}
          >
            <LeagueCode code={l.shortName} accent={l.accent} className="h-6 min-w-[40px] text-[11px]" />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 truncate text-[14px] font-semibold text-fg group-hover:text-primary-strong">
                {l.name}
                {fav.has(l.id) && <Star className="size-3.5 fill-primary text-primary" aria-label="Favorit" />}
              </span>
              <span className="text-[11.5px] text-subtle">{l.country}</span>
            </span>
            <span className="text-right">
              <span className="tabular block text-[15px] font-semibold text-fg">{count}</span>
              <span className="block text-[10.5px] text-subtle">
                {count ? `op til ${formatPercent(best / 100, { signed: true, digits: 1 })}` : "ingen nu"}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
