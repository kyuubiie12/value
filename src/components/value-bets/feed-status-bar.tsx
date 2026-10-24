"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Radio, RefreshCw } from "lucide-react";
import type { FeedStatus } from "@/types";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Where the odds come from and how fresh they are. While a refresh is running
 * (or the first prices haven't landed yet) it re-reads the page every 15 s so
 * new value bets appear without a manual reload.
 */
export function FeedStatusBar({ status }: { status: FeedStatus }) {
  const router = useRouter();
  const waiting = status.source === "live" && (status.refreshing || status.pricedFixtures === 0) && !status.quotaSpent;

  React.useEffect(() => {
    if (!waiting) return;
    const t = setInterval(() => router.refresh(), 15_000);
    return () => clearInterval(t);
  }, [waiting, router]);

  if (status.source === "demo") {
    return (
      <p className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-line bg-surface/50 px-3.5 py-2 text-[12px] text-muted">
        <Radio className="size-3.5 text-subtle" aria-hidden />
        Demo-data — tilslut en odds-nøgle for at se rigtige odds.
      </p>
    );
  }

  return (
    <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1 rounded-[var(--radius-sm)] border border-line bg-surface/50 px-3.5 py-2 text-[12px] text-muted">
      {waiting ? (
        <RefreshCw className="size-3.5 animate-spin text-primary" aria-hidden />
      ) : (
        <span className="relative flex size-2">
          <span className={cn("absolute inline-flex size-full rounded-full", status.quotaSpent ? "bg-warning" : "bg-positive")} />
        </span>
      )}
      <span className="font-medium text-fg">
        {status.quotaSpent ? "Odds sat på pause" : "Live odds"}
      </span>
      <span className="text-subtle">
        {status.updatedAt
          ? `opdateret ${formatRelativeTime(status.updatedAt)} · ${status.pricedFixtures} kampe`
          : "henter de første priser…"}
      </span>
      {status.quotaSpent && (
        <span className="text-subtle">Dagens kvote hos odds-leverandøren er brugt — fortsætter i morgen.</span>
      )}
    </p>
  );
}
