import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { TraceRecord } from "../lib/types";
import { Card } from "./ui/card";

function latestRisk(trace: TraceRecord) {
  const score = trace.evaluations?.[0]?.scores?.find((item) => item.metric === "hallucination_risk")?.score;
  if (score == null) {
    return { label: "Pending", className: "bg-muted text-muted-foreground" };
  }
  if (score >= 0.6) {
    return { label: "High", className: "bg-red-50 text-red-700 ring-1 ring-red-200" };
  }
  if (score >= 0.3) {
    return { label: "Medium", className: "bg-amber-50 text-amber-800 ring-1 ring-amber-200" };
  }
  return { label: "Low", className: "bg-teal-50 text-teal-800 ring-1 ring-teal-200" };
}

function displayModel(model: string) {
  return model.replace(/-\d{4}-\d{2}-\d{2}$/, "");
}

export function TraceTable({ traces, projectId }: { traces: TraceRecord[]; projectId?: string }) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border p-5">
        <div>
          <h2 className="text-base font-semibold">Trace Ledger</h2>
          <p className="text-sm text-muted-foreground">Recent model calls with quality and cost signals.</p>
        </div>
        <div className="hidden rounded-md border border-border bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground sm:block">{traces.length} records</div>
      </div>
      {traces.length === 0 ? (
        <div className="p-5 text-sm text-muted-foreground">No traces yet. Send one with the SDK or `POST /api/ingest/traces` using a project API key.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-[#eef1f0] text-xs uppercase tracking-[0.12em] text-muted-foreground">
              <tr>
                <th className="px-5 py-3">Trace</th>
                <th className="px-5 py-3">Model</th>
                <th className="px-5 py-3">Latency</th>
                <th className="px-5 py-3">Tokens</th>
                <th className="px-5 py-3">Cost</th>
                <th className="px-5 py-3">Risk</th>
              </tr>
            </thead>
            <tbody>
              {traces.map((trace) => {
                const risk = latestRisk(trace);
                return (
                <tr key={trace.id} className="border-t border-border bg-white transition hover:bg-[#fbfaf7]">
                  <td className="px-5 py-4 font-medium">
                    <Link className="inline-flex items-center gap-2 hover:text-primary" href={`/traces/${trace.id}${projectId ? `?projectId=${projectId}` : ""}`}>
                      {trace.name}
                      <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
                    </Link>
                  </td>
                  <td className="px-5 py-4 text-muted-foreground" title={trace.model}>{displayModel(trace.model)}</td>
                  <td className="px-5 py-4">{trace.latencyMs} ms</td>
                  <td className="px-5 py-4">{trace.totalTokens.toLocaleString()}</td>
                  <td className="px-5 py-4">${Number(trace.costUsd).toFixed(4)}</td>
                  <td className="px-5 py-4">
                    <span className={`rounded-md px-2 py-1 text-xs font-semibold ${risk.className}`}>{risk.label}</span>
                  </td>
                </tr>
              );})}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
