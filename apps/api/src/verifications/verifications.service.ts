import { Injectable, NotFoundException } from "@nestjs/common";
import {
  buildSampleConfidence,
  buildVerificationSummarySentence,
  classifyReplayRun,
  deriveSwitchRecommendationStatus,
  passRateFromAggregate,
  switchStatusLabel,
  type ReplayAggregate
} from "@sentinelai/shared";
import { PrismaService } from "../prisma/prisma.service";
import { ProjectsRepository } from "../projects/projects.repository";

function previewText(value: string, max = 120) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= max) {
    return normalized;
  }
  return `${normalized.slice(0, max)}…`;
}

@Injectable()
export class VerificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projects: ProjectsRepository
  ) {}

  private async assertProject(ownerId: string, projectId: string) {
    const project = await this.projects.findOwned(projectId, ownerId);
    if (!project) {
      throw new NotFoundException("Project not found");
    }
    return project;
  }

  private aggregateFromExperiment(experiment: {
    passedRuns: number;
    borderlineRuns: number;
    failedRuns: number;
    criticalFailures: number;
  }): ReplayAggregate {
    const totalRuns = experiment.passedRuns + experiment.borderlineRuns + experiment.failedRuns;
    return {
      passedRuns: experiment.passedRuns,
      borderlineRuns: experiment.borderlineRuns,
      failedRuns: experiment.failedRuns,
      criticalFailures: experiment.criticalFailures,
      totalRuns,
      passRate: totalRuns === 0 ? null : experiment.passedRuns / totalRuns
    };
  }

  private mapExperiment(
    experiment: {
      id: string;
      taskName: string;
      baselineProvider: string;
      baselineModel: string;
      candidateProvider: string;
      candidateModel: string;
      status: string;
      passedRuns: number;
      borderlineRuns: number;
      failedRuns: number;
      criticalFailures: number;
      averageCandidateSemantic: number | null;
      averageCandidateHallucination: number | null;
      estimatedSavingsPercent: number | null;
      qualityThreshold: number;
      reason: string | null;
      completedAt: Date | null;
      updatedAt: Date;
    },
    extras?: { monthlySavingsUsd?: number | null }
  ) {
    const aggregate = this.aggregateFromExperiment(experiment);
    const switchStatus = deriveSwitchRecommendationStatus({
      passedRuns: experiment.passedRuns,
      borderlineRuns: experiment.borderlineRuns,
      failedRuns: experiment.failedRuns,
      criticalFailures: experiment.criticalFailures,
      experimentStatus: experiment.status
    });
    const confidence = buildSampleConfidence(aggregate.totalRuns);

    return {
      id: experiment.id,
      taskName: experiment.taskName,
      currentProvider: experiment.baselineProvider,
      currentModel: experiment.baselineModel,
      candidateProvider: experiment.candidateProvider,
      candidateModel: experiment.candidateModel,
      experimentStatus: experiment.status,
      switchStatus,
      switchStatusLabel: switchStatusLabel(switchStatus),
      passRate: passRateFromAggregate(aggregate),
      passedRuns: experiment.passedRuns,
      borderlineRuns: experiment.borderlineRuns,
      failedRuns: experiment.failedRuns,
      criticalFailures: experiment.criticalFailures,
      totalReplayRuns: aggregate.totalRuns,
      averageQualityScore: experiment.averageCandidateSemantic,
      averageHallucinationRisk: experiment.averageCandidateHallucination,
      estimatedSavingsPercent: experiment.estimatedSavingsPercent,
      estimatedMonthlySavingsUsd: extras?.monthlySavingsUsd ?? null,
      qualityThreshold: experiment.qualityThreshold,
      reason: experiment.reason,
      completedAt: experiment.completedAt?.toISOString() ?? null,
      updatedAt: experiment.updatedAt.toISOString(),
      sampleConfidence: confidence,
      summarySentence: buildVerificationSummarySentence({
        taskName: experiment.taskName,
        passedRuns: experiment.passedRuns,
        borderlineRuns: experiment.borderlineRuns,
        failedRuns: experiment.failedRuns,
        totalRuns: aggregate.totalRuns,
        estimatedSavingsPercent: experiment.estimatedSavingsPercent,
        switchStatus
      })
    };
  }

  async list(ownerId: string, projectId: string, taskName?: string) {
    await this.assertProject(ownerId, projectId);
    const experiments = await this.prisma.shadowExperiment.findMany({
      where: {
        projectId,
        ...(taskName ? { taskName } : {}),
        baselineProvider: "openai",
        candidateProvider: "openai"
      },
      orderBy: { updatedAt: "desc" }
    });
    return experiments.map((experiment) => this.mapExperiment(experiment));
  }

  async get(ownerId: string, projectId: string, experimentId: string) {
    await this.assertProject(ownerId, projectId);
    const experiment = await this.prisma.shadowExperiment.findFirst({
      where: { id: experimentId, projectId },
      include: {
        runs: {
          orderBy: { createdAt: "desc" },
          take: 20
        }
      }
    });

    if (!experiment) {
      throw new NotFoundException("Verification not found");
    }

    const traceIds = experiment.runs.map((run) => run.traceId);
    const traces = await this.prisma.trace.findMany({
      where: { id: { in: traceIds } },
      select: { id: true, prompt: true }
    });
    const promptByTrace = new Map(traces.map((trace) => [trace.id, trace.prompt]));

    const taskCost = await this.prisma.trace.aggregate({
      where: { projectId, name: experiment.taskName, status: "SUCCESS" },
      _sum: { costUsd: true },
      _count: { id: true }
    });
    const totalCost = Number(taskCost._sum.costUsd ?? 0);
    const traceCount = taskCost._count.id;
    const monthlySavingsUsd =
      experiment.estimatedSavingsPercent != null && traceCount > 0
        ? Number((totalCost * (experiment.estimatedSavingsPercent / 100) * 30).toFixed(2))
        : null;

    return {
      ...this.mapExperiment(experiment, { monthlySavingsUsd }),
      runs: experiment.runs.map((run) => {
        const explanation = classifyReplayRun({
          semanticScore: run.semanticScore,
          hallucinationScore: run.hallucinationScore,
          qualityThreshold: experiment.qualityThreshold,
          riskLevel: "MEDIUM",
          replayFailed: !run.candidateResponse
        });

        return {
          id: run.id,
          traceId: run.traceId,
          promptPreview: previewText(promptByTrace.get(run.traceId) ?? ""),
          baselinePreview: previewText(run.baselineResponse),
          candidatePreview: previewText(run.candidateResponse),
          semanticScore: run.semanticScore,
          hallucinationScore: run.hallucinationScore,
          verdict: explanation.verdict,
          reason: explanation.reason,
          riskCategory: explanation.riskCategory,
          critical: explanation.critical,
          passed: explanation.verdict === "pass",
          createdAt: run.createdAt.toISOString()
        };
      })
    };
  }
}
