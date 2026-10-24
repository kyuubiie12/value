"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function ToggleChip({
  active,
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        "glow-hover inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
        "transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
        active
          ? "border-primary/40 bg-primary/12 text-primary-strong"
          : "border-line bg-surface-2 text-muted hover:border-line-strong hover:text-fg",
        className,
      )}
      {...props}
    >
      <span
        aria-hidden
        className={cn(
          "size-1.5 rounded-full transition-colors",
          active ? "bg-primary" : "bg-line-strong",
        )}
      />
      {children}
    </button>
  );
}
