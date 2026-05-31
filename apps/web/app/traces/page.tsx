"use client";

import Link from "next/link";
import { AppShell } from "../../components/app-shell";
import { PageHeader } from "../../components/page-header";
import { TraceTable } from "../../components/trace-table";
import { WorkspaceToolbar } from "../../components/workspace-toolbar";
import { saveSelectedProjectId } from "../../lib/auth";
import { useProjectWorkspace } from "../../lib/use-project-workspace";

export default function TracesPage() {
  const workspace = useProjectWorkspace();

  return (
    <AppShell>
      <div className="page-container space-y-8">
        <PageHeader
          eyebrow="Traces"
          title="Production evidence"
          description="Raw prompt/response records from your app. Verification samples these for shadow replay."
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

        {workspace.ready && !workspace.token ? (
          <p className="text-sm text-muted-foreground">
            <Link className="font-semibold text-primary hover:underline" href="/login">
              Sign in
            </Link>{" "}
            to view traces.
          </p>
        ) : null}

        <TraceTable traces={workspace.traces} projectId={workspace.projectId} />
      </div>
    </AppShell>
  );
}
