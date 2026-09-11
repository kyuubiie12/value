import * as React from "react";
import { ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: { value: string; label: string }[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, options, ...props }, ref) => (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          "h-9 w-full cursor-pointer appearance-none rounded-[var(--radius-sm)] border border-line bg-bg pl-3 pr-9 text-[13px] text-fg",
          "transition-colors duration-150 outline-none hover:border-line-strong",
          "focus-visible:border-primary/70 focus-visible:ring-2 focus-visible:ring-ring/25",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-bg-elevated text-fg">
            {o.label}
          </option>
        ))}
      </select>
      <ChevronsUpDown
        className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-subtle"
        aria-hidden
      />
    </div>
  ),
);
Select.displayName = "Select";
