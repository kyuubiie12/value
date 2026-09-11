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
import type { Currency, EquityPoint } from "@/types";
import { formatCurrency, formatDate, formatSignedCurrency } from "@/lib/format";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";

type Metric = "cumulativeProfit" | "bankroll";
type Range = "30" | "90" | "all";

export function PerformanceChart({
  data,
  currency,
}: {
  data: EquityPoint[];
  currency: Currency;
}) {
  const [metric, setMetric] = React.useState<Metric>("cumulativeProfit");
  const [range, setRange] = React.useState<Range>("all");
  const [now] = React.useState(() => Date.now());

  const filtered = React.useMemo(() => {
    if (range === "all") return data;
    const cutoff = now - Number(range) * 86_400_000;
    const points = data.filter((p) => new Date(p.date).getTime() >= cutoff);
    return points.length > 1 ? points : data.slice(-2);
  }, [data, range, now]);

  const last = filtered.at(-1);
  const first = filtered[0];
  const change = last && first ? last[metric] - first[metric] : 0;
  const positive = change >= 0;

  return (
    <Card className="h-full">
      <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>Akkumuleret performance</CardTitle>
          <CardDescription>
            {metric === "cumulativeProfit" ? "Samlet profit" : "Bankroll"} ·{" "}
            <span
              className={positive ? "font-medium text-positive" : "font-medium text-negative"}
            >
              {formatSignedCurrency(change, currency)}
            </span>{" "}
            i perioden
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented<Metric>
            size="sm"
            value={metric}
            onChange={setMetric}
            options={[
              { value: "cumulativeProfit", label: "Profit" },
              { value: "bankroll", label: "Bankroll" },
            ]}
          />
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
      </CardHeader>
      <CardContent>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={filtered} margin={{ top: 6, right: 6, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">
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
                tickFormatter={(v) =>
                  v === 0
                    ? "0"
                    : `${(v / 1000).toLocaleString("da-DK", { maximumFractionDigits: 1 })}k`
                }
                stroke="var(--fg-subtle)"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                width={36}
              />
              {metric === "cumulativeProfit" && (
                <ReferenceLine y={0} stroke="var(--line-strong)" strokeWidth={1} />
              )}
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
                formatter={(value) => [
                  formatCurrency(Number(value), currency),
                  metric === "cumulativeProfit" ? "Profit" : "Bankroll",
                ]}
              />
              <Area
                type="monotone"
                dataKey={metric}
                stroke="var(--primary)"
                strokeWidth={1.75}
                fill="url(#equityFill)"
                isAnimationActive={false}
                activeDot={{ r: 3.5, fill: "var(--primary)", stroke: "var(--bg-elevated)", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
