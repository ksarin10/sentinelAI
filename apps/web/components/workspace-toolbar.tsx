"use client";

import { Loader2, PlayCircle, RefreshCw } from "lucide-react";
import type { ProjectRecord } from "../lib/types";
import { ProjectSelector } from "./project-selector";
import { Button } from "./ui/button";

export function WorkspaceToolbar({
  projects,
  projectId,
  onProjectChange,
  onRefresh,
  onRunVerification,
  verificationBusy,
  showVerification = true,
  refreshDisabled
}: {
  projects: ProjectRecord[];
  projectId: string;
  onProjectChange: (id: string) => void;
  onRefresh?: () => void;
  onRunVerification?: () => void;
  verificationBusy?: boolean;
  showVerification?: boolean;
  refreshDisabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <ProjectSelector projects={projects} projectId={projectId} onChange={onProjectChange} />
      {onRefresh ? (
        <Button variant="secondary" size="sm" onClick={onRefresh} disabled={refreshDisabled || verificationBusy}>
          <RefreshCw className="h-4 w-4" />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      ) : null}
      {showVerification && onRunVerification ? (
        <Button size="sm" onClick={onRunVerification} disabled={!projectId || verificationBusy}>
          {verificationBusy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <PlayCircle className="h-4 w-4" />
          )}
          {verificationBusy ? "Verifying…" : "Run verification"}
        </Button>
      ) : null}
    </div>
  );
}
