import { Injectable } from "@nestjs/common";
import { AnalyticsService } from "../analytics/analytics.service";
import { ModelCatalogService } from "../model-catalog/model-catalog.service";
import { PrismaService } from "../prisma/prisma.service";
import { findRecommendationCandidates } from "./recommendation-candidates";
import { buildRecommendationInsights } from "./recommendation-insights";
import {
  buildProviderCapabilities,
  partitionCandidatesForShadow,
  readEconomicsForApi
} from "./recommendation-verification";
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
    const [taskModels, catalog, profiles, summary] = await Promise.all([
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
      }),
      this.analytics.summary(ownerId, projectId)
    ]);

    const configuredProviders = await this.providerCredentials.configuredProviders(projectId);
    const unfilteredCandidates = findRecommendationCandidates(taskModels, catalog, profiles, configuredProviders, {
      applyMinSavingsFilter: false
    });
    const candidates = findRecommendationCandidates(taskModels, catalog, profiles, configuredProviders).filter(
      (candidate) => candidate.recommendedProvider === candidate.currentProvider
    );
    const economics = readEconomicsForApi();
    const { verifiable, suggestions } = partitionCandidatesForShadow(candidates, configuredProviders);
    const sameProviderSuggestions = suggestions.filter(
      (suggestion) => suggestion.recommendedProvider === suggestion.currentProvider
    );
    const providerCapabilities = buildProviderCapabilities(configuredProviders);

    await this.shadowExperiments.syncCandidates(projectId, verifiable, economics);
    const [passedExperiments, experimentCounts, latestFailedReason] = await Promise.all([
      this.shadowExperiments.listPassed(projectId),
      this.shadowExperiments.experimentCounts(projectId),
      this.shadowExperiments.latestFailedReason(projectId)
    ]);

    const recommendations = buildVerifiedRecommendations(verifiable, passedExperiments, catalog);
    const insights = buildRecommendationInsights(recommendations, {
      traceCount: summary.traceCount,
      analytics: taskModels,
      candidates: verifiable,
      unfilteredCandidates,
      profiles,
      configuredProviders,
      pendingExperiments: experimentCounts.pendingExperiments,
      failedExperiments: experimentCounts.failedExperiments,
      latestFailedReason,
      suggestions: sameProviderSuggestions
    });

    return {
      recommendations,
      suggestions: sameProviderSuggestions,
      providerCapabilities: buildProviderCapabilities(configuredProviders).filter(
        (capability) => capability.provider === "openai"
      ),
      economics,
      insights
    };
  }
}
