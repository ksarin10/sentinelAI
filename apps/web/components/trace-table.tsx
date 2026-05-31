import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { TraceRecord } from "../lib/types";
import { Panel } from "./panel";

function latestRisk(trace: TraceRecord) {
  const score = trace.evaluations?.[0]?.scores?.find((item) => item.metric === "hallucination_risk")?.score;
  if (score == null) {
    return { label: "Pending", className: "bg-muted text-muted-foreground" };
  }
  if (score >= 0.6) {
    return { label: "High", className: "bg-red-50 text-red-700 ring-1 ring-red-200/80" };
  }
  if (score >= 0.3) {
    return { label: "Medium", className: "bg-amber-50 text-amber-800 ring-1 ring-amber-200/80" };
  }
  return { label: "Low", className: "bg-primary/10 text-primary ring-1 ring-primary/20" };
}

function displayModel(model: string) {
  return model.replace(/-\d{4}-\d{2}-\d{2}$/, "");
}

export function TraceTable({ traces, projectId }: { traces: TraceRecord[]; projectId?: string }) {
  return (
    <Panel
      title="Production traces"
      description="Evidence sampled during shadow verification."
      action={
        <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
          {traces.length} records
        </span>
      }
      padding={false}
    >
      {traces.length === 0 ? (
        <p className="px-6 py-8 text-sm text-muted-foreground">
          No traces yet. Send traffic with the SDK or POST /api/ingest/traces using a project API key.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Trace</th>
                <th>Model</th>
                <th>Latency</th>
                <th>Tokens</th>
                <th>Cost</th>
                <th>Risk</th>
              </tr>
            </thead>
            <tbody>
              {traces.map((trace) => {
                const risk = latestRisk(trace);
                return (
                  <tr key={trace.id}>
                    <td className="font-medium">
                      <Link
                        className="inline-flex items-center gap-1.5 text-foreground hover:text-primary"
                        href={`/traces/${trace.id}${projectId ? `?projectId=${projectId}` : ""}`}
                      >
                        {trace.name}
                        <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
                      </Link>
                    </td>
                    <td className="text-muted-foreground" title={trace.model}>
                      {displayModel(trace.model)}
                    </td>
                    <td className="tabular-nums">{trace.latencyMs} ms</td>
                    <td className="tabular-nums">{trace.totalTokens.toLocaleString()}</td>
                    <td className="tabular-nums">${Number(trace.costUsd).toFixed(4)}</td>
                    <td>
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${risk.className}`}>
                        {risk.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
