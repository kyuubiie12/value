import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "h-10 w-full rounded-[var(--radius-sm)] border border-line/80 bg-bg px-3.5 text-[13px] text-fg",
      "placeholder:text-subtle",
      "transition-colors duration-150 outline-none",
      "hover:border-line-strong",
      "focus-visible:border-primary/70 focus-visible:ring-2 focus-visible:ring-ring/25",
      "disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";

export function Label({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("mb-1.5 block text-[11px] font-medium text-muted", className)}
      {...props}
    />
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-subtle">{hint}</p>}
    </div>
  );
}
