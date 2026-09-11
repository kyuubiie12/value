import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import type { TrackRecordStats } from "@/types";
import { formatDate, formatPercent } from "@/lib/format";

/** Compact track-record proof shown above the feed — the reason to follow. */
export function TrustStrip({ stats }: { stats: TrackRecordStats }) {
  return (
    <Link
      href="/results"
      className="group flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-[var(--radius-sm)] border border-line bg-surface/50 px-3.5 py-2.5 transition-colors hover:border-line-strong"
    >
      <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
        <ShieldCheck className="size-3.5 text-primary-strong" />
        Track record
      </span>
      <Metric label="Yield" value={formatPercent(stats.roi, { signed: true })} />
      <Metric
        label="Gns. CLV"
        value={formatPercent(stats.avgClv, { signed: true })}
      />
      <Metric label="Hit rate" value={formatPercent(stats.hitRate)} />
      <Metric label="Picks" value={`${stats.picks}`} />
      <span className="ml-auto flex items-center gap-1 text-[11px] font-medium text-muted transition-colors group-hover:text-fg">
        Se alle resultater siden {formatDate(stats.since)}
        <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex items-baseline gap-1.5 text-[12px]">
      <span className="text-subtle">{label}</span>
      <span className="tabular font-semibold text-fg">{value}</span>
    </span>
  );
}
