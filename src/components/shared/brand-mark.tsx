import { cn } from "@/lib/utils";

/** The logo tile + wordmark, without a link. For auth / onboarding shells. */
export function BrandMark({
  size = "md",
  className,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const tile =
    size === "lg" ? "size-9" : size === "sm" ? "size-[26px]" : "size-[30px]";
  const glyph =
    size === "lg" ? "size-5" : size === "sm" ? "size-[15px]" : "size-[17px]";
  const text =
    size === "lg" ? "text-[19px]" : size === "sm" ? "text-[15px]" : "text-[17px]";

  return (
    <span className={cn("flex items-center gap-2", className)}>
      <span
        aria-hidden
        className={cn(
          "grid shrink-0 place-items-center rounded-[10px] bg-primary text-primary-contrast",
          "shadow-[var(--shadow-sm)]",
          tile,
        )}
      >
        <svg viewBox="0 0 24 24" className={glyph} fill="none" aria-hidden>
          <path
            d="M12 3v18M12 3l6 4M12 3L6 7M4 12h16M6 17l6 4 6-4"
            stroke="currentColor"
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span
        className={cn(
          "font-semibold tracking-[-0.02em] text-fg",
          text,
        )}
      >
        ValueBet<span className="text-primary-strong">&nbsp;AI</span>
      </span>
    </span>
  );
}
