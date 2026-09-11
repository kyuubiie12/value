import { cn } from "@/lib/utils";

/** A shimmering placeholder block. Use while a section's data loads. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-[var(--radius-sm)] bg-surface-2",
        className,
      )}
    />
  );
}
