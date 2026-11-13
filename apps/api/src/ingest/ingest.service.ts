import { InjectQueue } from "@nestjs/bullmq";
import { Injectable } from "@nestjs/common";
import { Prisma, Project } from "@prisma/client";
import { Queue } from "bullmq";
import { tryDispatchEvaluation } from "../evaluations/evaluation-jobs";
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

  private traceData(project: Project, dto: IngestTraceDto): Prisma.TraceUncheckedCreateInput {
    const promptTokens = dto.tokens?.promptTokens ?? 0;
    const completionTokens = dto.tokens?.completionTokens ?? 0;
    return {
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
      totalTokens: dto.tokens?.totalTokens ?? promptTokens + completionTokens,
      costUsd: dto.costUsd ?? 0,
      metadata: dto.metadata as Prisma.InputJsonValue | undefined,
      startedAt: dto.startedAt ? new Date(dto.startedAt) : new Date(),
      endedAt: dto.endedAt ? new Date(dto.endedAt) : new Date()
    };
  }

  private async ensureEvaluationOutbox(traceId: string) {
    return this.prisma.$transaction(async (transaction) => {
      let evaluation = await transaction.evaluation.findFirst({
        where: { traceId },
        orderBy: { createdAt: "desc" },
        include: { dispatch: true }
      });
      if (!evaluation) {
        evaluation = await transaction.evaluation.create({
          data: { traceId, status: "QUEUED", dispatch: { create: {} } },
          include: { dispatch: true }
        });
      } else if (evaluation.status === "QUEUED" && !evaluation.dispatch) {
        await transaction.evaluationDispatch.create({ data: { evaluationId: evaluation.id } });
      }
      return evaluation;
    });
  }

  private async duplicateResult(traceId: string) {
    const evaluation = await this.ensureEvaluationOutbox(traceId);
    const dispatched =
      evaluation.status === "QUEUED"
        ? await tryDispatchEvaluation(this.prisma, this.evaluationsQueue, evaluation.id)
        : false;
    return {
      traceId,
      evaluationId: evaluation.id,
      queued: evaluation.status === "QUEUED" || evaluation.status === "RUNNING",
      dispatched,
      duplicate: true
    };
  }

  async ingest(project: Project, dto: IngestTraceDto) {
    if (dto.externalId) {
      const existing = await this.traces.findByExternalId(project.id, dto.externalId);
      if (existing) {
        return this.duplicateResult(existing.id);
      }
    }

    try {
      const created = await this.prisma.$transaction(async (transaction) => {
        const trace = await transaction.trace.create({ data: this.traceData(project, dto) });
        const evaluation = await transaction.evaluation.create({
          data: { traceId: trace.id, status: "QUEUED", dispatch: { create: {} } }
        });
        return { trace, evaluation };
      });
      const dispatched = await tryDispatchEvaluation(this.prisma, this.evaluationsQueue, created.evaluation.id);
      return {
        traceId: created.trace.id,
        evaluationId: created.evaluation.id,
        queued: true,
        dispatched,
        duplicate: false
      };
    } catch (error) {
      if (dto.externalId && error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const existing = await this.traces.findByExternalId(project.id, dto.externalId);
        if (existing) {
          return this.duplicateResult(existing.id);
        }
      }
      throw error;
    }
  }
}
