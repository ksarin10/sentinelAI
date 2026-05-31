"use client";

import Link from "next/link";
import { AppShell } from "../../components/app-shell";
import { AlertBanner } from "../../components/alert-banner";
import { ModelSwitchPill } from "../../components/model-switch-pill";
import { PageHeader } from "../../components/page-header";
import { SwitchStatusBadge } from "../../components/switch-status-badge";
import { WorkspaceToolbar } from "../../components/workspace-toolbar";
import { Button } from "../../components/ui/button";
import { saveSelectedProjectId } from "../../lib/auth";
import { buildTaskSummaries } from "../../lib/task-summary";
import { useProjectWorkspace } from "../../lib/use-project-workspace";

export default function TasksPage() {
  const workspace = useProjectWorkspace();
  const taskSummaries = buildTaskSummaries(workspace.taskModels, workspace.recommendations, workspace.verifications);

  return (
    <AppShell>
      <div className="page-container space-y-8">
        <PageHeader
          eyebrow="Tasks"
          title="Production tasks"
          description="Traffic grouped by task name. SentinelAI finds and verifies same-provider downgrade paths per task."
        >
          <WorkspaceToolbar
            projects={workspace.projects}
            projectId={workspace.projectId}
            onProjectChange={(id) => {
              saveSelectedProjectId(id);
              void workspace.refresh(workspace.token, id);
            }}
            showVerification={false}
          />
        </PageHeader>

        {workspace.error ? <AlertBanner variant="error">{workspace.error}</AlertBanner> : null}

        {taskSummaries.length === 0 ? (
          <AlertBanner>
            Need more traces.{" "}
            <Link href="/settings" className="font-semibold text-primary hover:underline">
              Load demo data
            </Link>
            .
          </AlertBanner>
        ) : (
          <div className="grid gap-4">
            {taskSummaries.map((task) => (
              <article
                key={task.taskName}
                className="rounded-2xl border border-border bg-card p-6 shadow-panel transition hover:shadow-lift"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="font-display text-xl tracking-tight">{task.taskName}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{task.statusLabel}</p>
                  </div>
                  {task.recommendation ? <SwitchStatusBadge status={task.recommendation.switchStatus} size="lg" /> : null}
                </div>

                <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {[
                    { label: "Model", value: task.model },
                    { label: "Traces", value: task.traceCount.toLocaleString() },
                    { label: "Avg cost", value: `$${task.averageCostUsd.toFixed(4)}` },
                    { label: "Avg latency", value: `${Math.round(task.averageLatencyMs)} ms` }
                  ].map((item) => (
                    <div key={item.label}>
                      <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        {item.label}
                      </dt>
                      <dd className="mt-1 font-semibold tabular-nums">{item.value}</dd>
                    </div>
                  ))}
                </dl>

                {task.recommendation ? (
                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/50 px-4 py-3">
                    <ModelSwitchPill
                      from={task.recommendation.currentModel}
                      to={task.recommendation.recommendedModel}
                    />
                    <span className="text-sm font-bold text-primary">
                      {task.recommendation.estimatedSavingsPercent}% est. savings
                    </span>
                  </div>
                ) : null}

                <div className="mt-5">
                  <Link href={`/verification?task=${encodeURIComponent(task.taskName)}`}>
                    <Button variant="secondary" size="sm">
                      Open verification
                    </Button>
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
