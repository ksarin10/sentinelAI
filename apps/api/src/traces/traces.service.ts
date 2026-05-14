import { Injectable, NotFoundException } from "@nestjs/common";
import { ProjectsService } from "../projects/projects.service";
import { TracesRepository } from "./traces.repository";

@Injectable()
export class TracesService {
  constructor(
    private readonly traces: TracesRepository,
    private readonly projects: ProjectsService
  ) {}

  async list(ownerId: string, projectId: string) {
    await this.projects.get(projectId, ownerId);
    return this.traces.list(projectId);
  }

  async get(ownerId: string, projectId: string, traceId: string) {
    await this.projects.get(projectId, ownerId);
    const trace = await this.traces.get(projectId, traceId);
    if (!trace) {
      throw new NotFoundException("Trace not found");
    }
    return trace;
  }
}
