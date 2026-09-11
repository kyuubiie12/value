"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TrackRecordPoint } from "@/types";
import { formatDate } from "@/lib/format";
import { Segmented } from "@/components/ui/segmented";

type Range = "30" | "90" | "all";

export function TrackEquityChart({ data }: { data: TrackRecordPoint[] }) {
  const [range, setRange] = React.useState<Range>("all");
  const [now] = React.useState(() => Date.now());

  const filtered = React.useMemo(() => {
    if (range === "all") return data;
    const cutoff = now - Number(range) * 86_400_000;
    const pts = data.filter((p) => new Date(p.date).getTime() >= cutoff);
    return pts.length > 1 ? pts : data.slice(-2);
  }, [data, range, now]);

  const last = filtered.at(-1)?.cumulativeUnits ?? 0;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs text-subtle">Akkumuleret afkast i units</p>
        <Segmented<Range>
          size="sm"
          value={range}
          onChange={setRange}
          options={[
            { value: "30", label: "30d" },
            { value: "90", label: "90d" },
            { value: "all", label: "Alt" },
          ]}
        />
      </div>
      <div className="h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={filtered} margin={{ top: 6, right: 6, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="trackFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.22} />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--line)" strokeDasharray="2 4" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={(v) =>
                new Date(v).toLocaleDateString("da-DK", { day: "2-digit", month: "short" })
              }
              stroke="var(--fg-subtle)"
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: "var(--line)" }}
              minTickGap={40}
              dy={4}
            />
            <YAxis
              tickFormatter={(v) => `${v > 0 ? "+" : ""}${v}u`}
              stroke="var(--fg-subtle)"
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              width={38}
            />
            <ReferenceLine y={0} stroke="var(--line-strong)" strokeWidth={1} />
            <Tooltip
              cursor={{ stroke: "var(--line-strong)", strokeWidth: 1 }}
              contentStyle={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--line-strong)",
                borderRadius: 8,
                fontSize: 12,
                color: "var(--fg)",
                boxShadow: "var(--shadow-md)",
              }}
              labelStyle={{ color: "var(--fg-subtle)", marginBottom: 2 }}
              labelFormatter={(v) => formatDate(String(v))}
              formatter={(value, _n, item) => [
                `${Number(value) > 0 ? "+" : ""}${Number(value).toFixed(1)} units`,
                `Efter ${item?.payload?.picks ?? 0} picks`,
              ]}
            />
            <Area
              type="monotone"
              dataKey="cumulativeUnits"
              stroke="var(--primary)"
              strokeWidth={1.75}
              fill="url(#trackFill)"
              isAnimationActive={false}
              activeDot={{ r: 3.5, fill: "var(--primary)", stroke: "var(--bg-elevated)", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-1 text-right text-[11px] text-subtle">
        Nu:{" "}
        <span className="tabular font-semibold text-primary-strong">
          {last > 0 ? "+" : ""}
          {last.toFixed(1)} units
        </span>
      </p>
    </div>
  );
}
