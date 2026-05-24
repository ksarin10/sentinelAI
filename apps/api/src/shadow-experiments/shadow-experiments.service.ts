import { InjectQueue } from "@nestjs/bullmq";
import { Injectable } from "@nestjs/common";
import { Queue } from "bullmq";
import { PrismaService } from "../prisma/prisma.service";
import { RecommendationCandidate } from "../recommendations/recommendation-candidates";
import { PassedShadowExperiment } from "./shadow-experiment-engine";
import { queueShadowExperiment } from "./shadow-experiment-jobs";

@Injectable()
export class ShadowExperimentsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue("shadow-experiments") private readonly shadowQueue: Queue
  ) {}

  async syncCandidates(projectId: string, candidates: RecommendationCandidate[]) {
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

      if (experiment.status === "QUEUED") {
        await queueShadowExperiment(this.shadowQueue, experiment.id);
      }
    }
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
        failedRuns: true,
        averageCandidateSemantic: true,
        averageCandidateHallucination: true,
        estimatedSavingsPercent: true,
        qualityThreshold: true
      }
    });

    return experiments;
  }
}
