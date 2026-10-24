import * as React from "react";
import { cn } from "@/lib/utils";

export function TableWrap({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "w-full overflow-x-auto spot rounded-card border border-line/60 bg-surface shadow-[var(--shadow-card)]",
        className,
      )}
      {...props}
    />
  );
}

export function Table({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <table className={cn("w-full border-collapse text-[13px]", className)} {...props} />
  );
}

export function Th({
  className,
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "whitespace-nowrap border-b border-line px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-subtle",
        className,
      )}
      {...props}
    />
  );
}

export function Td({
  className,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn("whitespace-nowrap px-4 py-3 align-middle text-fg", className)}
      {...props}
    />
  );
}

export function Tr({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        "border-b border-line/50 transition-colors duration-100 last:border-0 hover:bg-surface-2/50",
        className,
      )}
      {...props}
    />
  );
}
