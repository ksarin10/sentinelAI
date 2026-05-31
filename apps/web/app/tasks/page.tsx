"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { AppShell } from "../../components/app-shell";
import { ProjectSelector } from "../../components/project-selector";
import { SwitchStatusBadge } from "../../components/switch-status-badge";
import { Button } from "../../components/ui/button";
import { saveSelectedProjectId } from "../../lib/auth";
import { buildTaskSummaries } from "../../lib/task-summary";
import { useProjectWorkspace } from "../../lib/use-project-workspace";

export default function TasksPage() {
  const workspace = useProjectWorkspace();
  const taskSummaries = buildTaskSummaries(workspace.taskModels, workspace.recommendations, workspace.verifications);

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-6 p-5 lg:p-8">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h1 className="text-2xl font-semibold">Tasks</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Each task groups production traffic so SentinelAI can suggest and verify a same-provider downgrade.
            </p>
          </div>
          <ProjectSelector
            projects={workspace.projects}
            projectId={workspace.projectId}
            onChange={(id) => {
              saveSelectedProjectId(id);
              void workspace.refresh(workspace.token, id);
            }}
          />
        </div>

        {workspace.error ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{workspace.error}</div> : null}

        {taskSummaries.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-white p-6 text-sm text-muted-foreground">
            Need more traces before verification. Ingest production traffic or{" "}
            <Link href="/settings" className="font-medium text-primary">
              load demo data
            </Link>
            .
          </div>
        ) : (
          <div className="grid gap-4">
            {taskSummaries.map((task) => (
              <div key={task.taskName} className="rounded-lg border border-border bg-white p-5 shadow-panel">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">{task.taskName}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{task.statusLabel}</p>
                  </div>
                  {task.recommendation ? <SwitchStatusBadge status={task.recommendation.switchStatus} /> : null}
                </div>
                <div className="mt-4 grid gap-3 text-sm sm:grid-cols-4">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Model</div>
                    <div className="mt-1 font-medium">{task.model}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Traces</div>
                    <div className="mt-1 font-medium">{task.traceCount}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Avg cost</div>
                    <div className="mt-1 font-medium">${task.averageCostUsd.toFixed(4)}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Avg latency</div>
                    <div className="mt-1 font-medium">{Math.round(task.averageLatencyMs)} ms</div>
                  </div>
                </div>
                {task.recommendation ? (
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md bg-muted/50 px-4 py-3 text-sm">
                    <div className="flex items-center gap-2">
                      <span>{task.recommendation.currentModel}</span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{task.recommendation.recommendedModel}</span>
                    </div>
                    <span className="font-semibold text-primary">{task.recommendation.estimatedSavingsPercent}% est. savings</span>
                  </div>
                ) : null}
                <div className="mt-4">
                  <Link href={`/verification?task=${encodeURIComponent(task.taskName)}`}>
                    <Button className="h-8 bg-white px-3 text-foreground ring-1 ring-border">
                      Open verification
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
