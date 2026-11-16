import { Activity, Clock3, Radio, Zap } from "lucide-react";
import type { TraceRecord } from "../lib/types";

function linePath(values: number[], width: number, height: number) {
  if (values.length === 0) return "";
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 1);
  return values
    .map((value, index) => {
      const x =
        values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
      const y = height - ((value - min) / range) * (height - 18) - 9;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export function TelemetryPulse({ traces }: { traces: TraceRecord[] }) {
  const recent = traces.slice(0, 24).reverse();
  const latencyValues = recent.length
    ? recent.map((trace) => trace.latencyMs)
    : [34, 39, 36, 48, 45, 55, 51, 62, 58, 74, 66, 69, 82, 77, 88, 79, 91, 84];
  const path = linePath(latencyValues, 720, 210);
  const areaPath = path ? `${path} L720,210 L0,210 Z` : "";
  const averageLatency = traces.length
    ? Math.round(
        traces.reduce((sum, trace) => sum + trace.latencyMs, 0) / traces.length,
      )
    : 0;
  const errorRate = traces.length
    ? (traces.filter((trace) => trace.status !== "SUCCESS").length /
        traces.length) *
      100
    : 0;
  const modelCount = new Set(
    traces.map((trace) => `${trace.provider}:${trace.model}`),
  ).size;

  return (
    <section className="glass-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
            <Activity className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold">Traffic pulse</h2>
            <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
              Production inference telemetry
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-1 font-mono text-[9px] uppercase tracking-[0.08em] text-muted-foreground">
          <span className="px-2 py-1">1h</span>
          <span className="rounded bg-white/[0.07] px-2 py-1 text-foreground">
            24h
          </span>
          <span className="px-2 py-1">7d</span>
        </div>
      </div>

      <div className="grid border-b border-border sm:grid-cols-3">
        {[
          {
            icon: Clock3,
            label: "Avg latency",
            value: traces.length ? `${averageLatency} ms` : "Awaiting data",
          },
          { icon: Zap, label: "Error rate", value: `${errorRate.toFixed(2)}%` },
          { icon: Radio, label: "Active models", value: modelCount || "—" },
        ].map((metric, index) => (
          <div
            key={metric.label}
            className={`flex items-center gap-3 px-5 py-4 sm:px-6 ${index > 0 ? "border-t border-border sm:border-l sm:border-t-0" : ""}`}
          >
            <metric.icon className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="console-label">{metric.label}</p>
              <p className="mt-1 text-sm font-medium tabular-nums text-foreground">
                {metric.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="relative px-3 pb-2 pt-5 sm:px-5">
        <div className="pointer-events-none absolute left-6 top-5 z-10 flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.1em] text-primary">
          <span className="signal-dot" /> latency signal
        </div>
        <svg
          viewBox="0 0 720 230"
          className="h-[250px] w-full overflow-visible"
          role="img"
          aria-label="Recent trace latency signal"
        >
          <defs>
            <linearGradient id="pulse-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(81 88% 64%)" stopOpacity="0.2" />
              <stop offset="100%" stopColor="hsl(81 88% 64%)" stopOpacity="0" />
            </linearGradient>
            <filter
              id="pulse-glow"
              x="-20%"
              y="-30%"
              width="140%"
              height="160%"
            >
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {[44, 86, 128, 170, 212].map((y) => (
            <line
              key={y}
              x1="0"
              y1={y}
              x2="720"
              y2={y}
              stroke="hsl(220 13% 18%)"
              strokeDasharray="3 6"
            />
          ))}
          <path d={areaPath} fill="url(#pulse-fill)" />
          <path
            d={path}
            fill="none"
            stroke="hsl(81 88% 64%)"
            strokeWidth="2"
            filter="url(#pulse-glow)"
          />
          {latencyValues.map((value, index) => {
            if (index !== latencyValues.length - 1) return null;
            const max = Math.max(...latencyValues, 1);
            const min = Math.min(...latencyValues, 0);
            const y = 210 - ((value - min) / Math.max(max - min, 1)) * 192 - 9;
            return (
              <circle
                key={index}
                cx="720"
                cy={y}
                r="4"
                fill="hsl(81 88% 64%)"
                stroke="hsl(225 18% 6%)"
                strokeWidth="3"
              />
            );
          })}
        </svg>
        <div className="flex justify-between px-1 font-mono text-[9px] uppercase tracking-[0.08em] text-muted-foreground/60">
          <span>-24h</span>
          <span>-18h</span>
          <span>-12h</span>
          <span>-6h</span>
          <span>now</span>
        </div>
      </div>
    </section>
  );
}
