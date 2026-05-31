"use client";

import { ArrowRight, Loader2, PlayCircle, RefreshCw, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { AppShell } from "../../components/app-shell";
import { ProjectSelector } from "../../components/project-selector";
import { SwitchStatusBadge } from "../../components/switch-status-badge";
import { VerificationProgress } from "../../components/verification-progress";
import { Button } from "../../components/ui/button";
import { buildTaskSummaries, estimatedMonthlyCost, topExpensiveTask } from "../../lib/task-summary";
import { useProjectWorkspace } from "../../lib/use-project-workspace";
import { saveSelectedProjectId } from "../../lib/auth";

export default function OverviewPage() {
  const workspace = useProjectWorkspace();
  const taskSummaries = buildTaskSummaries(workspace.taskModels, workspace.recommendations, workspace.verifications);
  const topTask = topExpensiveTask(taskSummaries);
  const primaryRecommendation = workspace.recommendations[0] ?? null;
  const monthlyCost = estimatedMonthlyCost(workspace.summary.totalCostUsd, workspace.summary.traceCount);
  const monthlySavings = primaryRecommendation
    ? estimatedMonthlyCost(primaryRecommendation.estimatedSavingsUsd, workspace.summary.traceCount)
    : 0;

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-6 p-5 lg:p-8">
        <section className="rounded-lg border border-border bg-white p-6 shadow-panel">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#d96b4a]">Verified model switching</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">Can I safely switch models and save money?</h1>
              <p className="mt-3 text-sm text-muted-foreground">
                SentinelAI replays your real prompts against a cheaper same-provider model, checks whether quality holds,
                and shows estimated savings before you change production.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <ProjectSelector
                projects={workspace.projects}
                projectId={workspace.projectId}
                onChange={(id) => {
                  saveSelectedProjectId(id);
                  void workspace.refresh(workspace.token, id);
                }}
              />
              <Button
                className="bg-white text-foreground ring-1 ring-border"
                onClick={() => workspace.refresh()}
                disabled={workspace.verificationBusy}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
              <Button
                onClick={() => void workspace.runVerification()}
                disabled={!workspace.token || !workspace.projectId || workspace.verificationBusy}
              >
                {workspace.verificationBusy ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <PlayCircle className="mr-2 h-4 w-4" />
                )}
                {workspace.verificationBusy ? "Verifying…" : "Run verification"}
              </Button>
            </div>
          </div>
        </section>

        <VerificationProgress
          phase={workspace.verificationPhase ?? (workspace.verificationBusy ? "running" : null)}
          progress={workspace.verificationProgress}
          message={workspace.verificationMessage}
          taskName={workspace.verificationResultTask}
        />

        {workspace.ready && !workspace.token ? (
          <div className="rounded-md border border-border bg-white p-4 text-sm">
            <Link className="font-medium text-primary" href="/login">
              Sign in
            </Link>{" "}
            to verify model switches on your traffic.
          </div>
        ) : null}
        {workspace.error ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{workspace.error}</div> : null}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border border-border bg-white p-4 shadow-panel">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Production traces</div>
            <div className="mt-2 text-2xl font-semibold">{workspace.summary.traceCount.toLocaleString()}</div>
          </div>
          <div className="rounded-lg border border-border bg-white p-4 shadow-panel">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Current model spend</div>
            <div className="mt-2 text-2xl font-semibold">${workspace.summary.totalCostUsd.toFixed(2)}</div>
            <div className="mt-1 text-xs text-muted-foreground">~${monthlyCost.toFixed(0)}/mo at current volume</div>
          </div>
          <div className="rounded-lg border border-border bg-white p-4 shadow-panel">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Top expensive task</div>
            <div className="mt-2 text-lg font-semibold">{topTask?.taskName ?? "—"}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {topTask ? `${topTask.model} · ${topTask.traceCount} traces` : "Need more traces before verification"}
            </div>
          </div>
          <div className="rounded-lg border border-border bg-white p-4 shadow-panel">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Verified savings opportunity</div>
            <div className="mt-2 text-2xl font-semibold text-primary">
              {primaryRecommendation ? `~$${monthlySavings.toFixed(0)}/mo` : "—"}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {primaryRecommendation ? `${primaryRecommendation.estimatedSavingsPercent}% on ${primaryRecommendation.taskName}` : "Run verification after ingesting traces"}
            </div>
          </div>
        </div>

        <section className="rounded-lg border border-border bg-white p-6 shadow-panel">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Latest verification result</h2>
              <p className="mt-1 text-sm text-muted-foreground">Shadow-tested on your traffic — not generic benchmarks.</p>
            </div>
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          {primaryRecommendation ? (
            <div className="mt-5 rounded-md border border-border bg-muted/40 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">{primaryRecommendation.taskName}</div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <span>{primaryRecommendation.currentModel}</span>
                    <ArrowRight className="h-4 w-4" />
                    <span>{primaryRecommendation.recommendedModel}</span>
                  </div>
                </div>
                <SwitchStatusBadge status={primaryRecommendation.switchStatus} />
              </div>
              <p className="mt-4 text-sm">{primaryRecommendation.rationale[0]}</p>
              <div className="mt-4 flex flex-wrap gap-4 text-sm">
                <span>
                  Pass rate:{" "}
                  <strong>{primaryRecommendation.passRate != null ? `${Math.round(primaryRecommendation.passRate * 100)}%` : "—"}</strong>
                </span>
                <span>
                  Est. savings: <strong>{primaryRecommendation.estimatedSavingsPercent}%</strong>
                </span>
                <span>
                  Sampled replays: <strong>{primaryRecommendation.signals.verifiedRuns}</strong>
                </span>
              </div>
              <Link href={`/verification?task=${encodeURIComponent(primaryRecommendation.taskName)}`} className="mt-4 inline-flex text-sm font-medium text-primary">
                View verification details
              </Link>
            </div>
          ) : (
            <div className="mt-5 rounded-md border border-dashed border-border p-5 text-sm text-muted-foreground">
              <p>{workspace.recommendationInsights?.message ?? "Need more traces before verification."}</p>
              {(workspace.recommendationInsights?.pendingExperiments ?? 0) > 0 ? (
                <p className="mt-2">Shadow verification is running on sampled production prompts.</p>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-3">
                <Link href="/settings" className="font-medium text-primary">
                  Load demo traffic
                </Link>
                <span className="text-muted-foreground">or</span>
                <button
                  type="button"
                  className="font-medium text-primary disabled:opacity-50"
                  disabled={workspace.verificationBusy}
                  onClick={() => void workspace.runVerification()}
                >
                  {workspace.verificationBusy ? "Verification running…" : "Run verification"}
                </button>
              </div>
            </div>
          )}
        </section>

        {(workspace.migrations.length ?? 0) > 0 ? (
          <section className="rounded-lg border border-amber-200 bg-amber-50/70 p-5">
            <h2 className="text-sm font-semibold text-amber-950">Deprecated model alert</h2>
            <p className="mt-1 text-sm text-amber-900/90">
              {workspace.migrations[0].displayName} is receiving traffic ({workspace.migrations[0].totalTraceCount} traces).
              Plan a verified replacement before retirement.
            </p>
          </section>
        ) : null}
      </div>
    </AppShell>
  );
}
