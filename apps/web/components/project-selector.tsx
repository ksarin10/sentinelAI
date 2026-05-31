import { ChevronDown, FolderKanban } from "lucide-react";
import type { ProjectRecord } from "../lib/types";

export function ProjectSelector({
  projects,
  projectId,
  onChange
}: {
  projects: ProjectRecord[];
  projectId: string;
  onChange: (projectId: string) => void;
}) {
  if (projects.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      <FolderKanban className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <select
        className="h-9 min-w-[11rem] appearance-none rounded-xl border border-border bg-card py-0 pl-9 pr-9 text-sm font-semibold text-foreground shadow-panel outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/15"
        value={projectId}
        onChange={(event) => onChange(event.target.value)}
        aria-label="Select project"
      >
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.name}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}
