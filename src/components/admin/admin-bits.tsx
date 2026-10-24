import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

/** 30 days of signups as slim bars — zero days stay visible as a baseline tick. */
export function SignupChart({ days }: { days: { date: string; count: number }[] }) {
  const max = Math.max(1, ...days.map((d) => d.count));
  const total = days.reduce((a, d) => a + d.count, 0);
  return (
    <div>
      <div
        className="flex h-28 items-end gap-[3px]"
        role="img"
        aria-label={`${total} nye brugere de seneste 30 dage`}
      >
        {days.map((d) => (
          <div
            key={d.date}
            className="group relative flex h-full flex-1 items-end"
            title={`${formatDate(d.date)}: ${d.count} ${d.count === 1 ? "ny bruger" : "nye brugere"}`}
          >
            <div
              className={cn(
                "w-full rounded-t-[4px] transition-colors",
                d.count > 0
                  ? "bg-primary group-hover:bg-primary-strong"
                  : "bg-line-strong/50",
              )}
              style={{ height: d.count > 0 ? `${Math.max(12, (d.count / max) * 100)}%` : "3px" }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-subtle">
        <span>{formatDate(days[0]?.date ?? new Date().toISOString())}</span>
        <span>I dag</span>
      </div>
    </div>
  );
}

/** Ranked horizontal bars: label, count, share of the top item. */
export function BarList({
  rows,
  empty = "Ingen data endnu",
}: {
  rows: { label: string; count: number }[];
  empty?: string;
}) {
  if (!rows.length) return <p className="text-[12.5px] text-subtle">{empty}</p>;
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[12.5px]">
            <span className="truncate text-fg">{r.label}</span>
            <span className="tabular shrink-0 text-muted">{r.count}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${(r.count / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
