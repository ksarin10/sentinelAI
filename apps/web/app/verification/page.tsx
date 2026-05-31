"use client";

import { ArrowRight, Loader2, PlayCircle, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { AppShell } from "../../components/app-shell";
import { ProjectSelector } from "../../components/project-selector";
import { SwitchStatusBadge } from "../../components/switch-status-badge";
import { VerificationProgress } from "../../components/verification-progress";
import { Button } from "../../components/ui/button";
import { apiRequest } from "../../lib/api";
import { saveSelectedProjectId } from "../../lib/auth";
import type { VerificationDetailRecord } from "../../lib/types";
import { buildTaskSummaries } from "../../lib/task-summary";
import { useProjectWorkspace } from "../../lib/use-project-workspace";

function VerificationContent() {
  const searchParams = useSearchParams();
  const taskQuery = searchParams.get("task") ?? "";
  const workspace = useProjectWorkspace();
  const [detail, setDetail] = useState<VerificationDetailRecord | null>(null);

  const taskSummaries = buildTaskSummaries(workspace.taskModels, workspace.recommendations, workspace.verifications);
  const activeTask = taskSummaries.find((task) => task.taskName === taskQuery) ?? taskSummaries[0];
  const verification = activeTask?.verification ?? null;
  const recommendation =
    activeTask?.recommendation ??
    (verification
      ? {
          taskName: verification.taskName,
          currentProvider: verification.currentProvider,
          currentModel: verification.currentModel,
          recommendedProvider: verification.candidateProvider,
          recommendedModel: verification.candidateModel,
          recommendationScope: "SAME_PROVIDER" as const,
          recommendationType: "REDUCE_COST",
          switchStatus: verification.switchStatus,
          switchStatusLabel: verification.switchStatusLabel,
          passRate: verification.passRate,
          confidence: "MEDIUM" as const,
          estimatedSavingsUsd: 0,
          estimatedSavingsPercent: verification.estimatedSavingsPercent ?? 0,
          rationale: [
            verification.reason ??
              `Shadow-tested ${verification.passedRuns} sampled calls on your ${verification.taskName} traffic.`
          ],
          signals: {
            traceCount: activeTask?.traceCount ?? 0,
            currentAverageCostUsd: activeTask?.averageCostUsd ?? 0,
            currentAverageLatencyMs: activeTask?.averageLatencyMs ?? 0,
            currentErrorRate: 0,
            averageSemanticSimilarity: verification.averageQualityScore,
            averageHallucinationRisk: verification.averageHallucinationRisk,
            qualityThreshold: verification.qualityThreshold,
            riskLevel: "MEDIUM" as const,
            optimizationGoal: "REDUCE_COST",
            verifiedRuns: verification.passedRuns
          }
        }
      : null);

  useEffect(() => {
    if (!workspace.token || !workspace.projectId || !verification?.id) {
      setDetail(null);
      return;
    }
    void apiRequest<VerificationDetailRecord>(
      `/projects/${workspace.projectId}/verifications/${verification.id}`,
      { token: workspace.token }
    ).then(setDetail).catch(() => setDetail(null));
  }, [verification?.id, workspace.projectId, workspace.token]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-5 lg:p-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-2xl font-semibold">Verification</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Shadow replay on sampled production prompts — decisive pass / review / fail guidance.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
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
            disabled={!workspace.token || workspace.verificationBusy}
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

      <VerificationProgress
        phase={workspace.verificationPhase ?? (workspace.verificationBusy ? "running" : null)}
        progress={workspace.verificationProgress}
        message={workspace.verificationMessage}
        taskName={workspace.verificationResultTask}
      />

      {taskSummaries.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {taskSummaries.map((task) => (
            <Link
              key={task.taskName}
              href={`/verification?task=${encodeURIComponent(task.taskName)}`}
              className={`rounded-md border px-3 py-1.5 text-sm ${
                task.taskName === activeTask?.taskName
                  ? "border-primary bg-[#e8f7f4] text-primary"
                  : "border-border bg-white text-foreground"
              }`}
            >
              {task.taskName}
            </Link>
          ))}
        </div>
      ) : null}

      {!activeTask ? (
        <div className="rounded-lg border border-dashed border-border bg-white p-6 text-sm text-muted-foreground">
          Need more traces before verification.{" "}
          <Link href="/settings" className="font-medium text-primary">
            Load demo data
          </Link>{" "}
          or ingest production traffic, then run verification.
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <section className="space-y-4 rounded-lg border border-border bg-white p-6 shadow-panel">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">{activeTask.taskName}</h2>
                <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{recommendation?.currentModel ?? activeTask.model}</span>
                  <ArrowRight className="h-4 w-4" />
                  <span>{recommendation?.recommendedModel ?? verification?.candidateModel ?? "No candidate yet"}</span>
                </div>
              </div>
              {recommendation || verification ? (
                <SwitchStatusBadge status={recommendation?.switchStatus ?? verification?.switchStatus ?? "NOT_RUN"} />
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-md bg-muted/50 p-4 text-sm">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Replay status</div>
                <div className="mt-1 font-semibold">
                  {verification?.experimentStatus === "RUNNING" || verification?.experimentStatus === "QUEUED"
                    ? "Verifying on sampled traces"
                    : verification?.experimentStatus === "PASSED"
                      ? "Replay complete"
                      : verification?.experimentStatus === "FAILED"
                        ? "Replay failed"
                        : "Not started"}
                </div>
              </div>
              <div className="rounded-md bg-muted/50 p-4 text-sm">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Pass rate</div>
                <div className="mt-1 font-semibold">
                  {verification?.passRate != null ? `${Math.round(verification.passRate * 100)}%` : "—"}
                </div>
              </div>
              <div className="rounded-md bg-muted/50 p-4 text-sm">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Avg quality score</div>
                <div className="mt-1 font-semibold">
                  {detail?.averageQualityScore?.toFixed(2) ?? verification?.averageQualityScore?.toFixed(2) ?? "—"}
                </div>
              </div>
              <div className="rounded-md bg-muted/50 p-4 text-sm">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Est. savings</div>
                <div className="mt-1 font-semibold text-primary">
                  {recommendation?.estimatedSavingsPercent
                    ? `${recommendation.estimatedSavingsPercent}%`
                    : verification?.estimatedSavingsPercent
                      ? `${verification.estimatedSavingsPercent}%`
                      : "—"}
                </div>
              </div>
            </div>

            {verification?.experimentStatus === "FAILED" && verification.reason ? (
              <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">{verification.reason}</div>
            ) : null}
            {verification?.experimentStatus === "PASSED" ? (
              <div className="rounded-md border border-[#9ad7cf] bg-[#e8f7f4] p-4 text-sm text-[#0d6b5c]">
                Shadow-tested on your traffic. {verification.passedRuns} of {verification.passedRuns + verification.failedRuns}{" "}
                replays passed
                {verification.passRate != null ? ` (${Math.round(verification.passRate * 100)}%).` : "."}
              </div>
            ) : null}

            <div>
              <h3 className="text-sm font-semibold">Sampled replays</h3>
              <div className="mt-3 overflow-x-auto rounded-md border border-border">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead className="bg-muted text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2">Trace</th>
                      <th className="px-4 py-2">Quality</th>
                      <th className="px-4 py-2">Risk</th>
                      <th className="px-4 py-2">Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(detail?.runs ?? []).length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-4 text-muted-foreground">
                          {verification?.experimentStatus === "QUEUED" || verification?.experimentStatus === "RUNNING"
                            ? "Shadow verification is running on sampled production prompts."
                            : "No replay rows yet. Run verification after ingesting traces."}
                        </td>
                      </tr>
                    ) : (
                      detail?.runs.map((run) => (
                        <tr key={run.id} className="border-t border-border">
                          <td className="px-4 py-2 font-mono text-xs">{run.traceId.slice(0, 10)}…</td>
                          <td className="px-4 py-2">{run.semanticScore.toFixed(2)}</td>
                          <td className="px-4 py-2">{run.hallucinationScore.toFixed(2)}</td>
                          <td className="px-4 py-2">{run.passed ? "Pass" : "Fail"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <aside className="rounded-lg border border-border bg-[#101820] p-5 text-white shadow-panel">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-white/55">Final recommendation</h3>
            <div className="mt-4">
              {recommendation || verification ? (
                <>
                  <SwitchStatusBadge status={recommendation?.switchStatus ?? verification?.switchStatus ?? "NOT_RUN"} />
                  <p className="mt-4 text-sm text-white/75">
                    {recommendation?.switchStatus === "SAFE_TO_SWITCH" || verification?.switchStatus === "SAFE_TO_SWITCH"
                      ? "Quality held on sampled production prompts. Safe to switch to the cheaper model."
                      : recommendation?.switchStatus === "NEEDS_REVIEW" || verification?.switchStatus === "NEEDS_REVIEW"
                        ? "Most replays passed. Review edge cases before switching in production."
                        : recommendation?.switchStatus === "DO_NOT_SWITCH" || verification?.switchStatus === "DO_NOT_SWITCH"
                          ? "Quality did not hold on enough sampled prompts. Do not switch yet."
                          : "Verification is still running on sampled traces."}
                  </p>
                  <p className="mt-3 text-xs text-white/55">
                    Threshold {(recommendation?.signals.qualityThreshold ?? verification?.qualityThreshold ?? 0.8).toFixed(2)}.
                    Candidate: {recommendation?.recommendedModel ?? verification?.candidateModel}.
                  </p>
                </>
              ) : (
                <p className="text-sm text-white/70">
                  Need more traces before verification. Load demo traffic in Settings, then run verification.
                </p>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

export default function VerificationPage() {
  return (
    <AppShell>
      <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Loading verification…</div>}>
        <VerificationContent />
      </Suspense>
    </AppShell>
  );
}
