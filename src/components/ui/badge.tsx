import * as React from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "primary" | "positive" | "negative" | "warning" | "info";

const TONES: Record<Tone, string> = {
  neutral: "bg-surface-2 text-muted ring-line",
  primary: "bg-primary/10 text-primary-strong ring-primary/20",
  positive: "bg-positive/10 text-positive ring-positive/20",
  negative: "bg-negative/10 text-negative ring-negative/20",
  warning: "bg-warning/10 text-warning ring-warning/20",
  info: "bg-info/10 text-info ring-info/20",
};

export function Badge({
  className,
  tone = "neutral",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-[var(--radius-sm)] px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset",
        TONES[tone],
        className,
      )}
      {...props}
    />
  );
}
