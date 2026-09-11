import type { Bet } from "@/types";
import { formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Sparkline } from "@/components/shared/sparkline";

/**
 * Closing-line value — the honest long-run signal. Beating the close means the
 * price you took was better than where the market settled.
 */
export function ClvCard({ bets }: { bets: Bet[] }) {
  const samples = bets
    .filter(
      (b): b is Bet & { clvPercent: number; settledAt: string } =>
        typeof b.clvPercent === "number" && !!b.settledAt,
    )
    .sort((a, b) => +new Date(a.settledAt) - +new Date(b.settledAt));

  if (samples.length < 3) return null;

  const avg =
    samples.reduce((s, b) => s + b.clvPercent, 0) / samples.length / 100;
  const beat = samples.filter((b) => b.clvPercent > 0).length / samples.length;

  // Running-average CLV over time — smooths the noise into a trend.
  const running: number[] = [];
  let sum = 0;
  samples.forEach((b, i) => {
    sum += b.clvPercent;
    running.push(sum / (i + 1));
  });

  const good = avg >= 0;

  return (
    <div className="flex flex-col gap-4 rounded-card border border-line bg-surface p-4 sm:flex-row sm:items-center">
      <div className="flex flex-1 items-center gap-5">
        <Metric
          label="Gns. CLV"
          value={formatPercent(avg, { signed: true })}
          tone={good ? "positive" : "negative"}
        />
        <span className="h-8 w-px bg-line" />
        <Metric label="Slår slutodds" value={formatPercent(beat, { digits: 0 })} />
        <span className="hidden h-8 w-px bg-line sm:block" />
        <p className="hidden max-w-[220px] text-[11px] leading-relaxed text-subtle sm:block">
          Positiv CLV over tid = du rammer priser før markedet retter sig. Det er
          det, der holder på lang sigt.
        </p>
      </div>
      <Sparkline
        values={running}
        width={160}
        height={40}
        stroke={good ? "var(--positive)" : "var(--negative)"}
        className="h-10 w-full sm:w-40"
      />
    </div>
  );
}

function Metric({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "positive" | "negative";
}) {
  return (
    <div className="leading-tight">
      <p className="text-[10px] font-medium uppercase tracking-wide text-subtle">
        {label}
      </p>
      <p
        className={cn(
          "tabular mt-1 text-lg font-semibold",
          tone === "positive" && "text-positive",
          tone === "negative" && "text-negative",
          tone === "neutral" && "text-fg",
        )}
      >
        {value}
      </p>
    </div>
  );
}
