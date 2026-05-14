import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, NotFoundException } from "@nestjs/common";
import { Queue } from "bullmq";
import { PrismaService } from "../prisma/prisma.service";
import { ProjectsService } from "../projects/projects.service";

@Injectable()
export class EvaluationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projects: ProjectsService,
    @InjectQueue("evaluations") private readonly evaluationsQueue: Queue
  ) {}

  async queue(ownerId: string, projectId: string, traceId: string) {
    await this.projects.get(projectId, ownerId);
    const trace = await this.prisma.trace.findFirst({ where: { id: traceId, projectId } });
    if (!trace) {
      throw new NotFoundException("Trace not found");
    }
    const evaluation = await this.prisma.evaluation.create({ data: { traceId } });
    await this.evaluationsQueue.add("evaluate-trace", { traceId, evaluationId: evaluation.id });
    return evaluation;
  }

  async list(ownerId: string, projectId: string) {
    await this.projects.get(projectId, ownerId);
    return this.prisma.evaluation.findMany({
      where: { trace: { projectId } },
      include: { scores: true, trace: { select: { id: true, name: true, model: true, createdAt: true } } },
      orderBy: { createdAt: "desc" },
      take: 100
    });
  }

  async get(ownerId: string, projectId: string, evaluationId: string) {
    await this.projects.get(projectId, ownerId);
    const evaluation = await this.prisma.evaluation.findFirst({
      where: { id: evaluationId, trace: { projectId } },
      include: { scores: true, trace: true }
    });
    if (!evaluation) {
      throw new NotFoundException("Evaluation not found");
    }
    return evaluation;
  }
}
