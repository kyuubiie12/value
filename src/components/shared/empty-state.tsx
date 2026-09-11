import * as React from "react";
import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-line px-6 py-16 text-center">
      <span className="grid size-10 place-items-center rounded-[10px] bg-surface-2 text-subtle">
        <Icon className="size-[18px]" strokeWidth={2} aria-hidden />
      </span>
      <p className="mt-3.5 text-[13px] font-semibold text-fg">{title}</p>
      {description && (
        <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
