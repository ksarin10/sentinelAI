"use client";

import { Loader2, PlayCircle, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { AppShell } from "../../components/app-shell";
import { ProjectSelector } from "../../components/project-selector";
import { VerificationSummaryCard } from "../../components/verification-summary-card";
import { VerificationProgress } from "../../components/verification-progress";
import { Button } from "../../components/ui/button";
import { apiRequest } from "../../lib/api";
import { saveSelectedProjectId } from "../../lib/auth";
import type { ReplayVerdict, VerificationDetailRecord } from "../../lib/types";
import { buildTaskSummaries } from "../../lib/task-summary";
import { useProjectWorkspace } from "../../lib/use-project-workspace";

const verdictStyles: Record<ReplayVerdict, string> = {
  pass: "text-[#0d6b5c] font-medium",
  borderline: "text-amber-800 font-medium",
  fail: "text-red-700 font-medium"
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
    <div className="mx-auto max-w-6xl space-y-6 p-5 lg:p-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-2xl font-semibold">Verification</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Shadow replay on sampled production prompts — evidence for pass, borderline, and fail outcomes.
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
          <Button onClick={() => void workspace.runVerification()} disabled={!workspace.token || workspace.verificationBusy}>
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
            Load demo traffic
          </Link>{" "}
          or ingest production traffic, then run verification.
        </div>
      ) : verification ? (
        <div className="space-y-6">
          {verification.experimentStatus === "PASSED" ||
          verification.experimentStatus === "FAILED" ||
          verification.switchStatus !== "NOT_RUN" ? (
            <VerificationSummaryCard verification={verification} detail={detail} />
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-white p-6 text-sm text-muted-foreground">
              {verification.experimentStatus === "QUEUED" || verification.experimentStatus === "RUNNING"
                ? "Shadow verification is running on sampled production prompts."
                : "Run verification to shadow-test a cheaper model on your traffic."}
            </div>
          )}

          {verification.experimentStatus === "FAILED" && verification.reason ? (
            <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">{verification.reason}</div>
          ) : null}

          <section className="rounded-lg border border-border bg-white p-6 shadow-panel">
            <h3 className="text-sm font-semibold">Replay evidence</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Each row is a production prompt replayed against the candidate model.
            </p>
            <div className="mt-4 overflow-x-auto rounded-md border border-border">
              <table className="w-full min-w-[960px] text-left text-sm">
                <thead className="bg-muted text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Prompt</th>
                    <th className="px-3 py-2">Original response</th>
                    <th className="px-3 py-2">Candidate response</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Score</th>
                    <th className="px-3 py-2">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {(detail?.runs ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-4 text-muted-foreground">
                        {verification.experimentStatus === "QUEUED" || verification.experimentStatus === "RUNNING"
                          ? "Shadow verification is running on sampled production prompts."
                          : "No replay rows yet. Run verification after ingesting traces."}
                      </td>
                    </tr>
                  ) : (
                    detail?.runs.map((run) => (
                      <tr key={run.id} className="border-t border-border align-top">
                        <td className="max-w-[200px] px-3 py-3 text-xs text-muted-foreground">{run.promptPreview || "—"}</td>
                        <td className="max-w-[200px] px-3 py-3 text-xs text-muted-foreground">{run.baselinePreview || "—"}</td>
                        <td className="max-w-[200px] px-3 py-3 text-xs text-muted-foreground">{run.candidatePreview || "—"}</td>
                        <td className="px-3 py-3">
                          <span className={verdictStyles[run.verdict]}>{verdictLabel(run.verdict)}</span>
                          {run.riskCategory !== "none" && run.verdict !== "pass" ? (
                            <div className="mt-1 text-xs capitalize text-muted-foreground">
                              {run.riskCategory.replace(/_/g, " ")}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">{run.semanticScore.toFixed(2)}</td>
                        <td className="max-w-[220px] px-3 py-3 text-xs text-muted-foreground">{run.reason}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border bg-white p-6 text-sm text-muted-foreground">
          No verification for {activeTask.taskName} yet.{" "}
          <button
            type="button"
            className="font-medium text-primary disabled:opacity-50"
            disabled={workspace.verificationBusy}
            onClick={() => void workspace.runVerification()}
          >
            Run verification
          </button>
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
