"use client";

import Link from "next/link";
import { AppShell } from "../../components/app-shell";
import { ProjectSelector } from "../../components/project-selector";
import { TraceTable } from "../../components/trace-table";
import { saveSelectedProjectId } from "../../lib/auth";
import { useProjectWorkspace } from "../../lib/use-project-workspace";

export default function TracesPage() {
  const workspace = useProjectWorkspace();

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-6 p-5 lg:p-8">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h1 className="text-2xl font-semibold">Traces</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Evidence from production traffic. Verification replays sample these prompts — this is not the core product
              surface.
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
        {workspace.ready && !workspace.token ? (
          <div className="rounded-md border border-border bg-white p-4 text-sm">
            <Link className="font-medium text-primary" href="/login">
              Sign in
            </Link>{" "}
            to view traces.
          </div>
        ) : null}
        <TraceTable traces={workspace.traces} projectId={workspace.projectId} />
      </div>
    </AppShell>
  );
}
