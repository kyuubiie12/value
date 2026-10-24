import * as React from "react";
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  delta,
  deltaLabel,
  hint,
  tone = "neutral",
  className,
}: {
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  delta?: number;
  deltaLabel?: string;
  hint?: string;
  tone?: "neutral" | "positive" | "negative";
  className?: string;
}) {
  const positive = typeof delta === "number" && delta >= 0;
  return (
    <div className={cn("spot rounded-card border border-line/60 bg-surface p-4 shadow-[var(--shadow-card)]", className)}>
      <div className="flex items-center gap-2">
        {Icon && (
          <Icon className="size-3.5 text-subtle" aria-hidden strokeWidth={2} />
        )}
        <span className="text-[11px] font-medium uppercase tracking-wide text-subtle">
          {label}
        </span>
      </div>
      <div
        className={cn(
          "tabular mt-2.5 text-[22px] font-semibold leading-none",
          tone === "positive" && "text-positive",
          tone === "negative" && "text-negative",
          tone === "neutral" && "text-fg",
        )}
      >
        {value}
      </div>
      {(typeof delta === "number" || hint) && (
        <div className="mt-2 flex items-center gap-1.5 text-[11px]">
          {typeof delta === "number" && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 font-medium",
                positive ? "text-positive" : "text-negative",
              )}
            >
              {positive ? (
                <ArrowUpRight className="size-3" aria-hidden />
              ) : (
                <ArrowDownRight className="size-3" aria-hidden />
              )}
              {deltaLabel}
            </span>
          )}
          {hint && <span className="text-subtle">{hint}</span>}
        </div>
      )}
    </div>
  );
}
