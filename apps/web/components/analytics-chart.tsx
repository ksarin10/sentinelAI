"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AnalyticsPoint } from "@sentinelai/shared";
import { Card } from "./ui/card";

export function AnalyticsChart({ data = [] }: { data?: AnalyticsPoint[] }) {
  const chartData =
    data.length > 0
      ? data
      : [{ date: "No data", traces: 0, latencyMs: 0, tokens: 0, costUsd: 0 }];
  return (
    <Card className="p-5">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">Trace throughput</h2>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
            Volume and model round-trip time on the same timeline.
          </p>
        </div>
        <div className="hidden gap-3 text-xs text-muted-foreground sm:flex">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-primary" />
            Traces
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-accent" />
            Latency
          </span>
        </div>
      </div>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="4 6" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              fontSize={12}
            />
            <YAxis tickLine={false} axisLine={false} fontSize={12} />
            <Tooltip
              contentStyle={{
                borderRadius: 8,
                borderColor: "hsl(var(--border))",
                background: "hsl(var(--card))",
                color: "hsl(var(--foreground))",
                fontSize: 12,
              }}
            />
            <Area
              type="monotone"
              dataKey="traces"
              stroke="hsl(81 88% 64%)"
              fill="hsl(81 88% 64%)"
              fillOpacity={0.14}
            />
            <Area
              type="monotone"
              dataKey="latencyMs"
              stroke="hsl(190 92% 60%)"
              fill="hsl(190 92% 60%)"
              fillOpacity={0.08}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

export default AnalyticsChart;
