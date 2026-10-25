import Image from "next/image";
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
      <Image
        src="/brand/mentor-tile.svg"
        alt=""
        aria-hidden
        width={28}
        height={28}
        priority
        unoptimized
        className="size-7 shrink-0 rounded-[22%]"
      />
      <span className="text-[16px] font-semibold tracking-[-0.02em] text-fg">Mentor</span>
    </Link>
  );
}
