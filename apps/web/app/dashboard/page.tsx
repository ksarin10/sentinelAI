"use client";

import {
  AlertTriangle,
  ArrowRight,
  CircleDollarSign,
  ListTodo,
  PiggyBank,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { AppShell } from "../../components/app-shell";
import { AlertBanner } from "../../components/alert-banner";
import { ModelSwitchPill } from "../../components/model-switch-pill";
import { PageHeader } from "../../components/page-header";
import { Panel } from "../../components/panel";
import { StatCard } from "../../components/stat-card";
import { SwitchStatusBadge } from "../../components/switch-status-badge";
import { TelemetryPulse } from "../../components/telemetry-pulse";
import { VerificationProgress } from "../../components/verification-progress";
import { WorkspaceToolbar } from "../../components/workspace-toolbar";
import {
  buildTaskSummaries,
  estimatedMonthlyCost,
  topExpensiveTask,
} from "../../lib/task-summary";
import { useProjectWorkspace } from "../../lib/use-project-workspace";
import { saveSelectedProjectId } from "../../lib/auth";

export default function OverviewPage() {
  const workspace = useProjectWorkspace();
  const taskSummaries = buildTaskSummaries(
    workspace.taskModels,
    workspace.recommendations,
    workspace.verifications,
  );
  const topTask = topExpensiveTask(taskSummaries);
  const primaryRecommendation = workspace.recommendations[0] ?? null;
  const latestVerification =
    [...workspace.verifications].sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt),
    )[0] ?? null;
  const monthlyCost = estimatedMonthlyCost(
    workspace.summary.totalCostUsd,
    workspace.summary.traceCount,
  );
  const monthlySavings =
    latestVerification?.estimatedMonthlySavingsUsd ??
    (primaryRecommendation
      ? estimatedMonthlyCost(
          primaryRecommendation.estimatedSavingsUsd,
          workspace.summary.traceCount,
        )
      : null);

  return (
    <AppShell>
      <div className="page-container space-y-8">
        <PageHeader
          hero
          eyebrow="Production intelligence · live"
          title="Model decisions, grounded in your traffic."
          description="Replay real prompts against lower-cost models, inspect every quality signal, and ship a switch only when the evidence holds."
        >
          <WorkspaceToolbar
            projects={workspace.projects}
            projectId={workspace.projectId}
            onProjectChange={(id) => {
              saveSelectedProjectId(id);
              void workspace.refresh(workspace.token, id);
            }}
            onRefresh={() => workspace.refresh()}
            onRunVerification={() => void workspace.runVerification()}
            verificationBusy={workspace.verificationBusy}
            refreshDisabled={workspace.verificationBusy}
          />
        </PageHeader>

        <VerificationProgress
          phase={
            workspace.verificationPhase ??
            (workspace.verificationBusy ? "running" : null)
          }
          progress={workspace.verificationProgress}
          message={workspace.verificationMessage}
          taskName={workspace.verificationResultTask}
        />

        {workspace.ready && !workspace.token ? (
          <AlertBanner>
            <Link
              className="font-semibold text-primary hover:underline"
              href="/login"
            >
              Sign in
            </Link>{" "}
            to verify model switches on your traffic.
          </AlertBanner>
        ) : null}
        {workspace.error ? (
          <AlertBanner variant="error">{workspace.error}</AlertBanner>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={PiggyBank}
            label="Verified savings"
            value={
              monthlySavings != null && monthlySavings > 0
                ? `~$${monthlySavings.toFixed(0)}/mo`
                : "—"
            }
            hint={
              primaryRecommendation
                ? `${primaryRecommendation.estimatedSavingsPercent}% on ${primaryRecommendation.taskName}`
                : "Run verification after ingesting traces"
            }
            highlight
          />
          <StatCard
            icon={CircleDollarSign}
            label="Monthly model spend"
            value={`$${monthlyCost.toFixed(0)}`}
            hint={`$${workspace.summary.totalCostUsd.toFixed(2)} observed · ${workspace.summary.traceCount} traces`}
          />
          <StatCard
            icon={ListTodo}
            label="Most expensive task"
            value={topTask?.taskName ?? "—"}
            hint={
              topTask
                ? `${topTask.model} · ${topTask.traceCount} traces`
                : "Need more traces"
            }
          />
          <StatCard
            icon={ShieldCheck}
            label="Latest verification"
            value={
              latestVerification ? (
                <SwitchStatusBadge
                  status={latestVerification.switchStatus}
                  size="lg"
                />
              ) : (
                "Not run"
              )
            }
            hint={
              latestVerification?.passRate != null
                ? `${(latestVerification.passRate * 100).toFixed(1)}% on ${latestVerification.totalReplayRuns} replays`
                : "Shadow-test on your traffic"
            }
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(22rem,0.85fr)]">
          <TelemetryPulse traces={workspace.traces} />
          <Panel
            title="Decision queue"
            description="Latest evidence-backed model verdict."
            className="h-full"
          >
            {latestVerification &&
            latestVerification.experimentStatus === "PASSED" ? (
              <div className="space-y-4 rounded-lg border border-primary/15 bg-primary/[0.025] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-foreground">
                      {latestVerification.taskName}
                    </p>
                    <div className="mt-3">
                      <ModelSwitchPill
                        from={latestVerification.currentModel}
                        to={latestVerification.candidateModel}
                      />
                    </div>
                  </div>
                  <SwitchStatusBadge
                    status={latestVerification.switchStatus}
                    size="lg"
                  />
                </div>
                <p className="text-sm leading-relaxed text-foreground/80">
                  {latestVerification.summarySentence}
                </p>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span>
                    Pass rate{" "}
                    <strong className="text-foreground">
                      {latestVerification.passRate != null
                        ? `${(latestVerification.passRate * 100).toFixed(1)}%`
                        : "—"}
                    </strong>
                  </span>
                  <span>
                    Sample{" "}
                    <strong className="text-foreground">
                      {latestVerification.totalReplayRuns} replays
                    </strong>
                  </span>
                  <span>
                    <strong className="text-foreground">
                      {latestVerification.sampleConfidence.label}
                    </strong>
                  </span>
                </div>
                <Link
                  href={`/verification?task=${encodeURIComponent(latestVerification.taskName)}`}
                  className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
                >
                  View replay evidence
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ) : primaryRecommendation ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {primaryRecommendation.taskName}
                    </p>
                    <div className="mt-3">
                      <ModelSwitchPill
                        from={primaryRecommendation.currentModel}
                        to={primaryRecommendation.recommendedModel}
                      />
                    </div>
                  </div>
                  <SwitchStatusBadge
                    status={primaryRecommendation.switchStatus}
                    size="lg"
                  />
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {primaryRecommendation.rationale[0]}
                </p>
                <Link
                  href={`/verification?task=${encodeURIComponent(primaryRecommendation.taskName)}`}
                  className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
                >
                  View verification details
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {workspace.recommendationInsights?.message ??
                    "Need more traces before verification."}
                </p>
                {(workspace.recommendationInsights?.pendingExperiments ?? 0) >
                0 ? (
                  <p className="text-sm text-muted-foreground">
                    Shadow verification is running on sampled prompts.
                  </p>
                ) : null}
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <Link
                    href="/settings"
                    className="font-semibold text-primary hover:underline"
                  >
                    Load demo traffic
                  </Link>
                  <span className="text-muted-foreground">or</span>
                  <button
                    type="button"
                    className="font-semibold text-primary hover:underline disabled:opacity-50"
                    disabled={workspace.verificationBusy}
                    onClick={() => void workspace.runVerification()}
                  >
                    {workspace.verificationBusy
                      ? "Verification running…"
                      : "Run verification"}
                  </button>
                </div>
              </div>
            )}
          </Panel>
        </div>

        {(workspace.migrations.length ?? 0) > 0 ? (
          <div className="flex gap-3 rounded-xl border border-amber-400/20 bg-amber-400/[0.06] px-5 py-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
            <div>
              <h2 className="text-sm font-semibold text-amber-200">
                Deprecated model alert
              </h2>
              <p className="mt-1 text-sm text-amber-100/65">
                {workspace.migrations[0].displayName} is receiving traffic (
                {workspace.migrations[0].totalTraceCount} traces). Plan a
                verified replacement before retirement.
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
