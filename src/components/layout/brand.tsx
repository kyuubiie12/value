import Link from "next/link";
import { cn } from "@/lib/utils";

export function Brand({ className }: { className?: string }) {
  return (
    <Link
      href="/value-bets"
      className={cn(
        "group flex shrink-0 items-center gap-2 rounded-[var(--radius-sm)] outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        className,
      )}
    >
      <span
        aria-hidden
        className="grid size-[26px] place-items-center rounded-[7px] bg-primary text-primary-contrast shadow-[0_4px_14px_-4px_rgba(16,185,129,0.55)]"
      >
        <svg viewBox="0 0 24 24" className="size-[15px]" fill="none" aria-hidden>
          <path
            d="M12 3v18M12 3l6 4M12 3L6 7M4 12h16M6 17l6 4 6-4"
            stroke="currentColor"
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="text-[15px] font-semibold tracking-[-0.02em] text-fg">
        ValueBet<span className="text-primary-strong">&nbsp;AI</span>
      </span>
    </Link>
  );
}
