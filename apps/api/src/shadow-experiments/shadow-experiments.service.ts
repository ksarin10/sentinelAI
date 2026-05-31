import { InjectQueue } from "@nestjs/bullmq";
import { Injectable } from "@nestjs/common";
import { Queue } from "bullmq";
import { readShadowEconomicsConfig, type ShadowEconomicsConfig } from "@sentinelai/shared";
import { PrismaService } from "../prisma/prisma.service";
import { RecommendationCandidate } from "../recommendations/recommendation-candidates";
import { PassedShadowExperiment } from "./shadow-experiment-engine";
import { queueShadowExperiment } from "./shadow-experiment-jobs";

function isRetryableShadowFailure(reason: string | null) {
  if (!reason) {
    return false;
  }

  return (
    reason.includes("No API key configured") ||
    reason.includes("Not enough baseline traces") ||
    reason.includes("Stopped early") ||
    reason.includes("did not meet the quality threshold")
  );
}

@Injectable()
export class ShadowExperimentsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue("shadow-experiments") private readonly shadowQueue: Queue
  ) {}

  private startOfUtcDay() {
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    return start;
  }

  async countExperimentsCreatedToday(projectId: string) {
    return this.prisma.shadowExperiment.count({
      where: { projectId, createdAt: { gte: this.startOfUtcDay() } }
    });
  }

  async syncCandidates(
    projectId: string,
    candidates: RecommendationCandidate[],
    economics: ShadowEconomicsConfig = readShadowEconomicsConfig(process.env)
  ) {
    let experimentsCreatedToday = await this.countExperimentsCreatedToday(projectId);

    for (const candidate of candidates) {
      const experiment = await this.prisma.shadowExperiment.upsert({
        where: {
          projectId_taskName_baselineProvider_baselineModel_candidateProvider_candidateModel: {
            projectId,
            taskName: candidate.taskName,
            baselineProvider: candidate.currentProvider,
            baselineModel: candidate.currentModel,
            candidateProvider: candidate.recommendedProvider,
            candidateModel: candidate.recommendedModel
          }
        },
        update: {
          qualityThreshold: candidate.qualityThreshold,
          estimatedSavingsPercent: candidate.estimatedSavingsPercent
        },
        create: {
          projectId,
          taskName: candidate.taskName,
          baselineProvider: candidate.currentProvider,
          baselineModel: candidate.currentModel,
          candidateProvider: candidate.recommendedProvider,
          candidateModel: candidate.recommendedModel,
          qualityThreshold: candidate.qualityThreshold,
          estimatedSavingsPercent: candidate.estimatedSavingsPercent,
          status: "QUEUED"
        }
      });

      const shouldRetryFailed = experiment.status === "FAILED" && isRetryableShadowFailure(experiment.reason);

      if (shouldRetryFailed) {
        await this.prisma.shadowExperiment.update({
          where: { id: experiment.id },
          data: {
            status: "QUEUED",
            reason: null,
            passedRuns: 0,
            failedRuns: 0,
            averageCandidateSemantic: null,
            averageCandidateHallucination: null,
            completedAt: null
          }
        });
      }

      if (experiment.status !== "QUEUED" && !shouldRetryFailed) {
        continue;
      }

      const isNewQueue = experiment.status === "QUEUED" && !shouldRetryFailed;
      if (isNewQueue && experimentsCreatedToday >= economics.maxExperimentsPerProjectPerDay) {
        continue;
      }

      await queueShadowExperiment(this.shadowQueue, experiment.id);
      if (isNewQueue) {
        experimentsCreatedToday += 1;
      }
    }
  }

  async latestFailedReason(projectId: string) {
    const experiment = await this.prisma.shadowExperiment.findFirst({
      where: { projectId, status: "FAILED" },
      orderBy: { completedAt: "desc" },
      select: { reason: true }
    });

    return experiment?.reason ?? null;
  }

  async experimentCounts(projectId: string) {
    const [pendingExperiments, failedExperiments] = await Promise.all([
      this.prisma.shadowExperiment.count({
        where: { projectId, status: { in: ["QUEUED", "RUNNING"] } }
      }),
      this.prisma.shadowExperiment.count({
        where: { projectId, status: "FAILED" }
      })
    ]);

    return { pendingExperiments, failedExperiments };
  }

  async listPassed(projectId: string): Promise<PassedShadowExperiment[]> {
    const experiments = await this.prisma.shadowExperiment.findMany({
      where: { projectId, status: "PASSED" },
      select: {
        taskName: true,
        baselineProvider: true,
        baselineModel: true,
        candidateProvider: true,
        candidateModel: true,
        passedRuns: true,
        borderlineRuns: true,
        failedRuns: true,
        criticalFailures: true,
        averageCandidateSemantic: true,
        averageCandidateHallucination: true,
        estimatedSavingsPercent: true,
        qualityThreshold: true
      }
    });

    return experiments;
  }
}
