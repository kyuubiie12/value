"use client";

import { cn } from "@/lib/utils";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
  size = "md",
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full border border-line/70 bg-bg p-[3px]",
        className,
      )}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "cursor-pointer rounded-full font-medium transition-colors duration-150 outline-none",
              "focus-visible:ring-2 focus-visible:ring-ring/30",
              size === "sm" ? "px-3 py-1 text-[11px]" : "px-3.5 py-1.5 text-xs",
              active
                ? "bg-surface-3 text-fg ring-1 ring-inset ring-white/[0.06] shadow-[0_1px_2px_rgba(4,8,14,0.5)]"
                : "text-subtle hover:bg-surface-2/60 hover:text-fg",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
