import { InjectQueue } from "@nestjs/bullmq";
import { Injectable } from "@nestjs/common";
import { Prisma, Project } from "@prisma/client";
import { Queue } from "bullmq";
import { queueTraceEvaluation } from "../evaluations/evaluation-jobs";
import { PrismaService } from "../prisma/prisma.service";
import { TracesRepository } from "../traces/traces.repository";
import { IngestTraceDto } from "./dto";

@Injectable()
export class IngestService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly traces: TracesRepository,
    @InjectQueue("evaluations") private readonly evaluationsQueue: Queue
  ) {}

  async ingest(project: Project, dto: IngestTraceDto) {
    const promptTokens = dto.tokens?.promptTokens ?? 0;
    const completionTokens = dto.tokens?.completionTokens ?? 0;
    const totalTokens = dto.tokens?.totalTokens ?? promptTokens + completionTokens;
    const trace = await this.traces.create({
      projectId: project.id,
      externalId: dto.externalId,
      name: dto.name,
      provider: dto.provider,
      model: dto.model,
      prompt: dto.prompt,
      response: dto.response,
      status: dto.status ?? "SUCCESS",
      latencyMs: dto.latencyMs,
      promptTokens,
      completionTokens,
      totalTokens,
      costUsd: dto.costUsd ?? 0,
      metadata: dto.metadata as Prisma.InputJsonValue | undefined,
      startedAt: dto.startedAt ? new Date(dto.startedAt) : new Date(),
      endedAt: dto.endedAt ? new Date(dto.endedAt) : new Date()
    });

    const { evaluation } = await queueTraceEvaluation(this.prisma, this.evaluationsQueue, trace.id);
    return { traceId: trace.id, evaluationId: evaluation.id, queued: true };
  }
}
