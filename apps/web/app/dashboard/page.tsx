"use client";

import type { AnalyticsSummary } from "@sentinelai/shared";
import { AlertTriangle, ArrowRight, Clock, Coins, Gauge, Layers3, RefreshCw, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "../../components/app-shell";
import { DashboardChart } from "../../components/dashboard-chart";
import { MetricCard } from "../../components/metric-card";
import { TraceTable } from "../../components/trace-table";
import { Button } from "../../components/ui/button";
import { apiRequest } from "../../lib/api";
import { getSelectedProjectId, getToken, saveSelectedProjectId } from "../../lib/auth";
import type {
  DashboardData,
  ModelMigrationRecord,
  ProjectRecord,
  RecommendationsResponse,
  TraceRecord
} from "../../lib/types";

const emptySummary: AnalyticsSummary = {
  traceCount: 0,
  averageLatencyMs: 0,
  totalTokens: 0,
  totalCostUsd: 0,
  errorRate: 0
};

export default function DashboardPage() {
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [projectId, setProjectId] = useState("");
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  async function load(authToken: string | null = token, projectOverride?: string) {
    if (!authToken) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const projectList = await apiRequest<ProjectRecord[]>("/projects", { token: authToken });
      setProjects(projectList);
      const saved = projectOverride ?? getSelectedProjectId();
      const activeProject = projectList.find((project) => project.id === saved) ?? projectList[0];
      if (!activeProject) {
        setData(null);
        setProjectId("");
        return;
      }
      setProjectId(activeProject.id);
      saveSelectedProjectId(activeProject.id);
      const [summary, timeseries, traces, recommendationPayload, modelMigrations] = await Promise.all([
        apiRequest<AnalyticsSummary>(`/projects/${activeProject.id}/analytics/summary`, { token: authToken }),
        apiRequest<DashboardData["timeseries"]>(`/projects/${activeProject.id}/analytics/timeseries`, { token: authToken }),
        apiRequest<TraceRecord[]>(`/projects/${activeProject.id}/traces`, { token: authToken }),
        apiRequest<RecommendationsResponse>(`/projects/${activeProject.id}/recommendations`, { token: authToken }),
        apiRequest<ModelMigrationRecord[]>(`/projects/${activeProject.id}/model-migrations`, { token: authToken })
      ]);
      setData({
        project: activeProject,
        summary,
        timeseries,
        traces,
        recommendations: recommendationPayload.recommendations,
        recommendationInsights: recommendationPayload.insights,
        modelMigrations
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load dashboard");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const authToken = getToken();
    setToken(authToken);
    setReady(true);
    void load(authToken);
  }, []);

  const summary = data?.summary ?? emptySummary;
  const hallucinationScores = data?.traces.flatMap((trace) => trace.evaluations?.[0]?.scores?.filter((score) => score.metric === "hallucination_risk") ?? []) ?? [];
  const averageRisk = hallucinationScores.length === 0 ? 0 : hallucinationScores.reduce((total, score) => total + score.score, 0) / hallucinationScores.length;
  const semanticScores = data?.traces.flatMap((trace) => trace.evaluations?.[0]?.scores?.filter((score) => score.metric === "semantic_similarity") ?? []) ?? [];
  const averageSemantic = semanticScores.length === 0 ? 0 : semanticScores.reduce((total, score) => total + score.score, 0) / semanticScores.length;

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl space-y-6 p-5 lg:p-8">
        <div className="rounded-lg border border-border bg-[#101820] p-5 text-white shadow-panel lg:p-6">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.06] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#9ad7cf]">
                <Sparkles className="h-3.5 w-3.5" />
                Signal room
              </div>
              <h1 className="text-3xl font-semibold tracking-normal">Model Operations</h1>
              <p className="mt-2 max-w-2xl text-sm text-white/62">Watch live traces, cost pressure, and evaluation drift for the selected AI product.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {projects.length > 0 ? (
              <select
                  className="h-10 rounded-md border border-white/10 bg-white px-3 text-sm text-foreground"
                value={projectId}
                onChange={(event) => {
                  setProjectId(event.target.value);
                  saveSelectedProjectId(event.target.value);
                  void load(token, event.target.value);
                }}
              >
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            ) : null}
              <Button className="bg-white text-foreground ring-1 ring-white/20" onClick={() => load()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>
        </div>
        {ready && !token ? (
          <div className="rounded-md border border-border bg-white p-4 text-sm">
            <Link className="font-medium text-primary" href="/login">Sign in</Link> to view live project analytics.
          </div>
        ) : null}
        {error ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
        {ready && !loading && token && projects.length === 0 ? (
          <div className="rounded-md border border-border bg-white p-4 text-sm">
            No projects yet. Create one in <Link className="font-medium text-primary" href="/projects">Projects and API Keys</Link>, then send traces with the generated key.
          </div>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Traces" value={summary.traceCount.toLocaleString()} hint={data?.project ? data.project.name : "Selected project"} icon={Layers3} />
          <MetricCard label="Avg latency" value={`${summary.averageLatencyMs} ms`} hint="Mean request duration" icon={Clock} />
          <MetricCard label="Token usage" value={summary.totalTokens.toLocaleString()} hint="Prompt and completion tokens" icon={Gauge} />
          <MetricCard label="Cost" value={`$${summary.totalCostUsd.toFixed(4)}`} hint={`${Math.round(summary.errorRate * 100)}% error rate`} icon={Coins} />
        </div>
        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <DashboardChart data={data?.timeseries ?? []} />
          <div className="rounded-lg border border-border bg-white p-5 shadow-panel">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-[#fff4ed] text-accent">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold">Evaluation Health</h2>
                <p className="text-sm text-muted-foreground">Async quality queue</p>
              </div>
            </div>
            <div className="mt-6 space-y-3 text-sm">
              <div className="flex justify-between rounded-md bg-muted px-3 py-2"><span>Evaluated traces</span><strong>{semanticScores.length}</strong></div>
              <div className="flex justify-between rounded-md bg-muted px-3 py-2"><span>Semantic avg</span><strong>{averageSemantic.toFixed(2)}</strong></div>
              <div className="flex justify-between rounded-md bg-muted px-3 py-2"><span>Hallucination risk</span><strong>{averageRisk.toFixed(2)}</strong></div>
              <div className="flex justify-between rounded-md bg-muted px-3 py-2"><span>Trace errors</span><strong>{Math.round(summary.errorRate * summary.traceCount)}</strong></div>
            </div>
          </div>
        </div>
        <div className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-lg border border-border bg-white p-5 shadow-panel">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold">Model Recommendations</h2>
                <p className="mt-1 text-sm text-muted-foreground">Cheaper model experiments based on task health and catalog pricing.</p>
              </div>
              <div className="rounded-md bg-[#e8f7f4] px-2.5 py-1 text-xs font-semibold text-primary">
                {(data?.recommendations.length ?? 0) > 0 ? `${data?.recommendations.length} verified` : "None yet"}
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {(data?.recommendations ?? []).slice(0, 3).map((recommendation) => (
                <div key={`${recommendation.taskName}-${recommendation.currentModel}-${recommendation.recommendedModel}`} className="rounded-md border border-border bg-muted/60 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold">{recommendation.taskName}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>{recommendation.currentProvider}/{recommendation.currentModel}</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                        <span>{recommendation.recommendedProvider}/{recommendation.recommendedModel}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-primary">{recommendation.estimatedSavingsPercent}%</div>
                      <div className="text-xs text-muted-foreground">est. savings</div>
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-muted-foreground">{recommendation.rationale[0]}</div>
                </div>
              ))}
              {(data?.recommendations.length ?? 0) === 0 ? (
                <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
                  <p>{data?.recommendationInsights.message ?? "No verified recommendations yet."}</p>
                  {(data?.recommendationInsights.pendingExperiments ?? 0) > 0 ? (
                    <p className="mt-2 text-xs">
                      {data?.recommendationInsights.pendingExperiments} shadow verification
                      {(data?.recommendationInsights.pendingExperiments ?? 0) === 1 ? "" : "s"} in progress.
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
          <div className="rounded-lg border border-border bg-white p-5 shadow-panel">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold">Migration Readiness</h2>
                <p className="mt-1 text-sm text-muted-foreground">Retiring or deprecated models currently receiving project traffic.</p>
              </div>
              <div className="rounded-md bg-[#fff4ed] px-2.5 py-1 text-xs font-semibold text-accent">{data?.modelMigrations.length ?? 0} risks</div>
            </div>
            <div className="mt-5 space-y-3">
              {(data?.modelMigrations ?? []).slice(0, 3).map((migration) => (
                <div key={`${migration.provider}-${migration.model}`} className="rounded-md border border-border bg-muted/60 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold">{migration.displayName}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{migration.totalTraceCount} traces across {migration.affectedTasks.length} task(s)</div>
                    </div>
                    <div className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-foreground">{migration.readiness.replaceAll("_", " ")}</div>
                  </div>
                  <div className="mt-3 text-xs text-muted-foreground">
                    {migration.replacementProvider && migration.replacementModel
                      ? `Test replacement: ${migration.replacementProvider}/${migration.replacementModel}`
                      : "No replacement is recorded yet."}
                  </div>
                </div>
              ))}
              {(data?.modelMigrations.length ?? 0) === 0 ? (
                <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">No retiring or deprecated model traffic detected for this project.</div>
              ) : null}
            </div>
          </div>
        </div>
        <TraceTable traces={data?.traces ?? []} projectId={projectId} />
      </div>
    </AppShell>
  );
}
