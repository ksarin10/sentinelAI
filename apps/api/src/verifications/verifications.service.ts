import { Injectable, NotFoundException } from "@nestjs/common";
import { deriveSwitchRecommendationStatus, passRate, switchStatusLabel } from "@sentinelai/shared";
import { PrismaService } from "../prisma/prisma.service";
import { ProjectsRepository } from "../projects/projects.repository";

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

  private mapExperiment(experiment: {
    id: string;
    taskName: string;
    baselineProvider: string;
    baselineModel: string;
    candidateProvider: string;
    candidateModel: string;
    status: string;
    passedRuns: number;
    failedRuns: number;
    averageCandidateSemantic: number | null;
    averageCandidateHallucination: number | null;
    estimatedSavingsPercent: number | null;
    qualityThreshold: number;
    reason: string | null;
    completedAt: Date | null;
    updatedAt: Date;
  }) {
    const switchStatus = deriveSwitchRecommendationStatus({
      passedRuns: experiment.passedRuns,
      failedRuns: experiment.failedRuns,
      experimentStatus: experiment.status
    });
    const rate = passRate(experiment.passedRuns, experiment.failedRuns);

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
      passRate: rate,
      passedRuns: experiment.passedRuns,
      failedRuns: experiment.failedRuns,
      averageQualityScore: experiment.averageCandidateSemantic,
      averageHallucinationRisk: experiment.averageCandidateHallucination,
      estimatedSavingsPercent: experiment.estimatedSavingsPercent,
      qualityThreshold: experiment.qualityThreshold,
      reason: experiment.reason,
      completedAt: experiment.completedAt?.toISOString() ?? null,
      updatedAt: experiment.updatedAt.toISOString()
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
          take: 20,
          select: {
            id: true,
            traceId: true,
            semanticScore: true,
            hallucinationScore: true,
            passed: true,
            createdAt: true
          }
        }
      }
    });

    if (!experiment) {
      throw new NotFoundException("Verification not found");
    }

    return {
      ...this.mapExperiment(experiment),
      runs: experiment.runs.map((run) => ({
        id: run.id,
        traceId: run.traceId,
        semanticScore: run.semanticScore,
        hallucinationScore: run.hallucinationScore,
        passed: run.passed,
        createdAt: run.createdAt.toISOString()
      }))
    };
  }
}
