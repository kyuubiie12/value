import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "outline" | "danger";
type Size = "sm" | "md" | "lg" | "icon";

const VARIANTS: Record<Variant, string> = {
  primary:
    "btn-shine btn-lift bg-primary text-primary-contrast hover:bg-primary-strong active:bg-primary",
  secondary: "bg-surface-3 text-fg hover:bg-line-strong active:bg-surface-3",
  ghost: "text-muted hover:text-fg hover:bg-surface-2 active:bg-surface",
  outline: "border border-line-strong text-fg hover:bg-surface-2 hover:border-fg-subtle",
  danger: "bg-negative/90 text-white hover:bg-negative",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3.5 text-xs gap-1.5 rounded-full",
  md: "h-9 px-4.5 text-[13px] gap-2 rounded-full",
  lg: "h-11 px-6 text-sm gap-2 rounded-full",
  icon: "size-9 rounded-full",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = "primary", size = "md", loading = false, disabled, children, ...props },
    ref,
  ) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "glow-hover inline-flex cursor-pointer items-center justify-center font-medium",
        "transition-[background-color,border-color,color,transform] duration-150 outline-none",
        "active:translate-y-px",
        "focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
        "disabled:pointer-events-none disabled:opacity-45",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  ),
);
Button.displayName = "Button";
