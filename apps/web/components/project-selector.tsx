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
    <select
      className="h-10 rounded-md border border-border bg-white px-3 text-sm text-foreground"
      value={projectId}
      onChange={(event) => onChange(event.target.value)}
    >
      {projects.map((project) => (
        <option key={project.id} value={project.id}>
          {project.name}
        </option>
      ))}
    </select>
  );
}
