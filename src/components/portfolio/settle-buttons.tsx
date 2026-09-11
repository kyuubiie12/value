"use client";

import * as React from "react";
import { Check, Minus, X } from "lucide-react";
import { settleBetAction } from "@/lib/actions";
import { cn } from "@/lib/utils";

type Result = "won" | "lost" | "void";

/** Win / loss / void buttons for settling an open bet. */
export function SettleButtons({
  betId,
  size = "md",
  onSettled,
}: {
  betId: string;
  size?: "sm" | "md";
  onSettled?: (status: Result) => void;
}) {
  const [pending, start] = React.useTransition();
  const [done, setDone] = React.useState<Result | null>(null);

  const settle = (status: Result) => {
    if (pending || done) return;
    setDone(status);
    onSettled?.(status);
    start(async () => {
      try {
        await settleBetAction(betId, status);
      } catch {
        setDone(null);
      }
    });
  };

  const base = cn(
    "inline-flex flex-1 items-center justify-center gap-1 rounded-[var(--radius-sm)] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
    size === "sm" ? "px-2 py-1 text-[11px]" : "px-2.5 py-1.5 text-[12px]",
  );

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        disabled={pending || done !== null}
        onClick={() => settle("won")}
        className={cn(base, "bg-positive/12 text-positive hover:bg-positive/20")}
      >
        <Check className="size-3.5" strokeWidth={2.5} />
        Vundet
      </button>
      <button
        type="button"
        disabled={pending || done !== null}
        onClick={() => settle("lost")}
        className={cn(base, "bg-negative/12 text-negative hover:bg-negative/20")}
      >
        <X className="size-3.5" strokeWidth={2.5} />
        Tabt
      </button>
      <button
        type="button"
        disabled={pending || done !== null}
        onClick={() => settle("void")}
        title="Kampen aflyst eller væddemålet annulleret"
        className={cn(base, "max-w-[68px] bg-surface-2 text-subtle hover:text-fg")}
      >
        <Minus className="size-3.5" />
        Void
      </button>
    </div>
  );
}
