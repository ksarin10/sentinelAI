"use client";

import { CheckCircle2, FlaskConical, RefreshCw, Timer, Waypoints } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AppShell } from "../../../components/app-shell";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { apiRequest } from "../../../lib/api";
import { getSelectedProjectId, getToken } from "../../../lib/auth";
import type { EvaluationScoreRecord, TraceRecord } from "../../../lib/types";

function score(trace: TraceRecord | null, metric: string): EvaluationScoreRecord | undefined {
  return trace?.evaluations?.[0]?.scores?.find((item) => item.metric === metric);
}

export default function TraceDetailPage({ params }: { params: { traceId: string } }) {
  const searchParams = useSearchParams();
  const [trace, setTrace] = useState<TraceRecord | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);

  async function loadTrace(authToken: string | null = token, activeProjectId: string | null = projectId) {
    if (!authToken || !activeProjectId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await apiRequest<TraceRecord>(`/projects/${activeProjectId}/traces/${params.traceId}`, { token: authToken });
      setTrace(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load trace");
    } finally {
      setLoading(false);
    }
  }

  async function queueEvaluation() {
    if (!token || !projectId) {
      return;
    }
    setError("");
    try {
      await apiRequest(`/projects/${projectId}/traces/${params.traceId}/evaluations`, { token, method: "POST" });
      await loadTrace(token, projectId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not queue evaluation");
    }
  }

  useEffect(() => {
    const authToken = getToken();
    const activeProjectId = searchParams.get("projectId") ?? getSelectedProjectId();
    setToken(authToken);
    setProjectId(activeProjectId);
    setReady(true);
    void loadTrace(authToken, activeProjectId);
  }, [params.traceId, searchParams]);

  const semantic = score(trace, "semantic_similarity");
  const hallucination = score(trace, "hallucination_risk");

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-6 p-5 lg:p-8">
        <div className="rounded-lg border border-border bg-white p-5 shadow-panel lg:p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-md border border-border bg-muted px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                <Waypoints className="h-3.5 w-3.5" />
                Trace inspection
              </div>
              <h1 className="text-3xl font-semibold">Trace {trace?.name ?? params.traceId}</h1>
              <p className="mt-2 text-sm text-muted-foreground">Prompt, response, latency, usage, and evaluation scores.</p>
          </div>
          <div className="flex gap-3">
              <Link className="inline-flex h-10 items-center rounded-md border border-border bg-white px-4 text-sm font-semibold shadow-panel" href="/dashboard">
              Dashboard
            </Link>
            <Button onClick={queueEvaluation} disabled={!trace}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Re-evaluate
            </Button>
          </div>
        </div>
        </div>
        {ready && !token ? <div className="rounded-md border border-border bg-white p-4 text-sm">Sign in at `/login` to view trace details.</div> : null}
        {ready && !projectId ? <div className="rounded-md border border-border bg-white p-4 text-sm">Select a project from the dashboard first.</div> : null}
        {loading ? <div className="rounded-md border border-border bg-white p-4 text-sm text-muted-foreground">Loading trace...</div> : null}
        {error ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
        {trace ? (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="p-5"><Timer className="mb-3 h-5 w-5 text-primary" /><div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Latency</div><div className="mt-2 text-2xl font-semibold">{trace.latencyMs} ms</div></Card>
              <Card className="p-5"><CheckCircle2 className="mb-3 h-5 w-5 text-primary" /><div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Semantic score</div><div className="mt-2 text-2xl font-semibold">{semantic ? semantic.score.toFixed(2) : "Pending"}</div></Card>
              <Card className="p-5"><FlaskConical className="mb-3 h-5 w-5 text-accent" /><div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Hallucination risk</div><div className="mt-2 text-2xl font-semibold">{hallucination ? hallucination.score.toFixed(2) : "Pending"}</div></Card>
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="p-5">
                <h2 className="text-base font-semibold">Prompt</h2>
                <pre className="mt-4 whitespace-pre-wrap rounded-md border border-border bg-[#fbfaf7] p-4 text-sm text-foreground">{trace.prompt}</pre>
              </Card>
              <Card className="p-5">
                <h2 className="text-base font-semibold">Response</h2>
                <pre className="mt-4 whitespace-pre-wrap rounded-md border border-border bg-[#fbfaf7] p-4 text-sm text-foreground">{trace.response ?? "No response captured."}</pre>
              </Card>
            </div>
            <Card className="p-5">
              <h2 className="text-base font-semibold">Metadata</h2>
              <div className="mt-4 grid gap-3 text-sm md:grid-cols-4">
                <div><span className="text-muted-foreground">Provider</span><div className="font-medium">{trace.provider}</div></div>
                <div><span className="text-muted-foreground">Model</span><div className="font-medium">{trace.model}</div></div>
                <div><span className="text-muted-foreground">Tokens</span><div className="font-medium">{trace.totalTokens.toLocaleString()}</div></div>
                <div><span className="text-muted-foreground">Cost</span><div className="font-medium">${Number(trace.costUsd).toFixed(4)}</div></div>
              </div>
              <pre className="mt-5 overflow-x-auto rounded-md border border-border bg-[#fbfaf7] p-4 text-xs">{JSON.stringify(trace.metadata ?? {}, null, 2)}</pre>
            </Card>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}
