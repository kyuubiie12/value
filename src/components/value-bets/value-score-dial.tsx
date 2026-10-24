import { valueScoreLabel, valueScoreTone } from "@/lib/value-score";
import { cn } from "@/lib/utils";

const TONE: Record<
  string,
  { from: string; to: string; text: string; glow: string }
> = {
  primary: {
    from: "var(--primary)",
    to: "var(--primary-strong)",
    text: "text-primary-strong",
    glow: "color-mix(in oklab, var(--color-primary) 38%, transparent)",
  },
  positive: {
    from: "var(--positive)",
    to: "#7df0c0",
    text: "text-positive",
    glow: "rgba(46,209,149,0.32)",
  },
  warning: {
    from: "var(--warning)",
    to: "#f5c877",
    text: "text-warning",
    glow: "rgba(236,176,74,0.3)",
  },
};

/** Circular 0–100 value-score gauge. */
export function ValueScoreDial({
  score,
  size = 76,
  showLabel = true,
}: {
  score: number;
  size?: number;
  showLabel?: boolean;
}) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const tone = valueScoreTone(score);
  const t = TONE[tone];
  const gid = `dial-${tone}`;

  return (
    <div className="flex items-center gap-3">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90 overflow-visible">
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={t.from} />
              <stop offset="100%" stopColor={t.to} />
            </linearGradient>
          </defs>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--surface-2)"
            strokeWidth={4}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={`url(#${gid})`}
            strokeWidth={4}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - score / 100)}
            
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <span className="tabular text-lg font-semibold text-fg">{score}</span>
        </div>
      </div>
      {showLabel && (
        <div>
          <p className={cn("text-[13px] font-semibold", t.text)}>
            {valueScoreLabel(score)}
          </p>
          <p className="text-[11px] text-subtle">Value score</p>
        </div>
      )}
    </div>
  );
}
