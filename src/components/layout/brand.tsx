import Link from "next/link";
import { cn } from "@/lib/utils";
import { MentorM } from "@/components/shared/brand-mark";

export function Brand({ className }: { className?: string }) {
  return (
    <Link
      href="/value-bets"
      className={cn(
        "group flex shrink-0 items-center gap-2.5 rounded-[var(--radius-sm)] outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        className,
      )}
    >
      <MentorM height={32} />
      <span className="text-[18px] font-semibold tracking-[-0.02em] text-fg">Mentor</span>
    </Link>
  );
}
