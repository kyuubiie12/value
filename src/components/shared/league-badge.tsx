import { getLeague } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

/** Small competition code, tinted with the league's identity colour. */
export function LeagueCode({
  code,
  accent,
  className,
}: {
  code: string;
  accent?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "tabular inline-grid h-[17px] min-w-[28px] place-items-center rounded-full px-1.5 text-[9px] font-semibold uppercase tracking-wide ring-1 ring-inset",
        !accent && "bg-surface-2 text-subtle ring-line",
        className,
      )}
      style={
        accent
          ? {
              backgroundColor: `${accent}22`,
              color: accent,
              boxShadow: `inset 0 0 0 1px ${accent}33`,
            }
          : undefined
      }
    >
      {code}
    </span>
  );
}

export function LeagueBadge({
  leagueId,
  className,
  showCountry = false,
}: {
  leagueId: string;
  className?: string;
  showCountry?: boolean;
}) {
  const league = getLeague(leagueId);
  if (!league) {
    return <span className={cn("text-xs text-subtle", className)}>{leagueId}</span>;
  }

  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs text-muted", className)}>
      <LeagueCode code={league.shortName} accent={league.accent} />
      <span className="truncate">{league.name}</span>
      {showCountry && <span className="text-subtle">· {league.country}</span>}
    </span>
  );
}
