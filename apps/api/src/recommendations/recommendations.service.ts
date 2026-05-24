import { Injectable } from "@nestjs/common";
import { AnalyticsService } from "../analytics/analytics.service";
import { ModelCatalogService } from "../model-catalog/model-catalog.service";
import { PrismaService } from "../prisma/prisma.service";
import { findRecommendationCandidates } from "./recommendation-candidates";
import { buildVerifiedRecommendations } from "../shadow-experiments/shadow-experiment-engine";
import { ProviderCredentialsService } from "../provider-credentials/provider-credentials.service";
import { ShadowExperimentsService } from "../shadow-experiments/shadow-experiments.service";

@Injectable()
export class RecommendationsService {
  constructor(
    private readonly analytics: AnalyticsService,
    private readonly modelCatalog: ModelCatalogService,
    private readonly prisma: PrismaService,
    private readonly providerCredentials: ProviderCredentialsService,
    private readonly shadowExperiments: ShadowExperimentsService
  ) {}

  async list(ownerId: string, projectId: string) {
    const [taskModels, catalog, profiles] = await Promise.all([
      this.analytics.taskModels(ownerId, projectId),
      this.modelCatalog.list({ status: "ACTIVE" }),
      this.prisma.taskProfile.findMany({
        where: { projectId },
        select: {
          taskName: true,
          riskLevel: true,
          qualityThreshold: true,
          optimizationGoal: true
        }
      })
    ]);

    const configuredProviders = await this.providerCredentials.configuredProviders(projectId);
    const candidates = findRecommendationCandidates(taskModels, catalog, profiles, configuredProviders);
    await this.shadowExperiments.syncCandidates(projectId, candidates);
    const passedExperiments = await this.shadowExperiments.listPassed(projectId);

    return buildVerifiedRecommendations(candidates, passedExperiments, catalog);
  }
}
