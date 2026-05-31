"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { AppShell } from "../../components/app-shell";
import { AlertBanner } from "../../components/alert-banner";
import { PageHeader } from "../../components/page-header";
import { Panel } from "../../components/panel";
import { VerificationSummaryCard } from "../../components/verification-summary-card";
import { VerificationProgress } from "../../components/verification-progress";
import { WorkspaceToolbar } from "../../components/workspace-toolbar";
import { apiRequest } from "../../lib/api";
import { saveSelectedProjectId } from "../../lib/auth";
import type { ReplayVerdict, VerificationDetailRecord } from "../../lib/types";
import { buildTaskSummaries } from "../../lib/task-summary";
import { useProjectWorkspace } from "../../lib/use-project-workspace";
import { cn } from "../../lib/utils";

const verdictStyles: Record<ReplayVerdict, string> = {
  pass: "bg-primary/10 text-primary ring-primary/20",
  borderline: "bg-amber-50 text-amber-900 ring-amber-200/80",
  fail: "bg-red-50 text-red-800 ring-red-200/80"
};

function verdictLabel(verdict: ReplayVerdict) {
  if (verdict === "pass") return "Pass";
  if (verdict === "borderline") return "Borderline";
  return "Fail";
}

function VerificationContent() {
  const searchParams = useSearchParams();
  const taskQuery = searchParams.get("task") ?? "";
  const workspace = useProjectWorkspace();
  const [detail, setDetail] = useState<VerificationDetailRecord | null>(null);

  const taskSummaries = buildTaskSummaries(workspace.taskModels, workspace.recommendations, workspace.verifications);
  const activeTask = taskSummaries.find((task) => task.taskName === taskQuery) ?? taskSummaries[0];
  const verification = activeTask?.verification ?? null;

  useEffect(() => {
    if (!workspace.token || !workspace.projectId || !verification?.id) {
      setDetail(null);
      return;
    }
    void apiRequest<VerificationDetailRecord>(
      `/projects/${workspace.projectId}/verifications/${verification.id}`,
      { token: workspace.token }
    )
      .then(setDetail)
      .catch(() => setDetail(null));
  }, [verification?.id, workspace.projectId, workspace.token]);

  return (
    <div className="page-container space-y-8">
      <PageHeader
        eyebrow="Verification"
        title="Replay evidence"
        description="Each row is a production prompt shadow-replayed against the candidate model — with pass, borderline, or fail reasoning."
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
        />
      </PageHeader>

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
              className={cn(
                "rounded-full border px-4 py-1.5 text-sm font-medium transition",
                task.taskName === activeTask?.taskName
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground"
              )}
            >
              {task.taskName}
            </Link>
          ))}
        </div>
      ) : null}

      {!activeTask ? (
        <AlertBanner>
          Need more traces.{" "}
          <Link href="/settings" className="font-semibold text-primary hover:underline">
            Load demo traffic
          </Link>{" "}
          or ingest production traffic, then run verification.
        </AlertBanner>
      ) : verification ? (
        <div className="space-y-6">
          {verification.experimentStatus === "PASSED" ||
          verification.experimentStatus === "FAILED" ||
          verification.switchStatus !== "NOT_RUN" ? (
            <VerificationSummaryCard verification={verification} detail={detail} />
          ) : (
            <AlertBanner>
              {verification.experimentStatus === "QUEUED" || verification.experimentStatus === "RUNNING"
                ? "Shadow verification is running on sampled production prompts."
                : "Run verification to shadow-test a cheaper model on your traffic."}
            </AlertBanner>
          )}

          {verification.experimentStatus === "FAILED" && verification.reason ? (
            <AlertBanner variant="error">{verification.reason}</AlertBanner>
          ) : null}

          <Panel title="Replay evidence" description="Prompt and response previews from shadow replay." padding={false}>
            <div className="overflow-x-auto">
              <table className="data-table min-w-[960px]">
                <thead>
                  <tr>
                    <th>Prompt</th>
                    <th>Original</th>
                    <th>Candidate</th>
                    <th>Status</th>
                    <th>Score</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {(detail?.runs ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-muted-foreground">
                        {verification.experimentStatus === "QUEUED" || verification.experimentStatus === "RUNNING"
                          ? "Shadow verification is running…"
                          : "No replay rows yet. Run verification after ingesting traces."}
                      </td>
                    </tr>
                  ) : (
                    detail?.runs.map((run) => (
                      <tr key={run.id}>
                        <td className="max-w-[180px] text-xs leading-relaxed text-muted-foreground">
                          {run.promptPreview || "—"}
                        </td>
                        <td className="max-w-[180px] text-xs leading-relaxed text-muted-foreground">
                          {run.baselinePreview || "—"}
                        </td>
                        <td className="max-w-[180px] text-xs leading-relaxed text-muted-foreground">
                          {run.candidatePreview || "—"}
                        </td>
                        <td>
                          <span
                            className={cn(
                              "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1",
                              verdictStyles[run.verdict]
                            )}
                          >
                            {verdictLabel(run.verdict)}
                          </span>
                          {run.riskCategory !== "none" && run.verdict !== "pass" ? (
                            <div className="mt-1 text-[10px] capitalize text-muted-foreground">
                              {run.riskCategory.replace(/_/g, " ")}
                            </div>
                          ) : null}
                        </td>
                        <td className="tabular-nums font-medium">{run.semanticScore.toFixed(2)}</td>
                        <td className="max-w-[200px] text-xs leading-relaxed text-muted-foreground">{run.reason}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      ) : (
        <AlertBanner>
          No verification for {activeTask.taskName} yet.{" "}
          <button
            type="button"
            className="font-semibold text-primary hover:underline disabled:opacity-50"
            disabled={workspace.verificationBusy}
            onClick={() => void workspace.runVerification()}
          >
            Run verification
          </button>
        </AlertBanner>
      )}
    </div>
  );
}

export default function VerificationPage() {
  return (
    <AppShell>
      <Suspense fallback={<div className="page-container text-sm text-muted-foreground">Loading verification…</div>}>
        <VerificationContent />
      </Suspense>
    </AppShell>
  );
}
