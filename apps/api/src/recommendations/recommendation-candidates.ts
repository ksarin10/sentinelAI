import { OptimizationGoal, TaskRiskLevel } from "@prisma/client";
import { selectRecommendationCandidate } from "@sentinelai/shared";
import { TaskModelAnalyticsPoint } from "../analytics/task-model-analytics";
import { ModelCatalogDto } from "../model-catalog/model-catalog.dto";

export type TaskProfileForRecommendation = {
  taskName: string;
  riskLevel: TaskRiskLevel;
  qualityThreshold: number;
  optimizationGoal: OptimizationGoal;
};

export type RecommendationCandidate = {
  taskName: string;
  currentProvider: string;
  currentModel: string;
  recommendedProvider: string;
  recommendedModel: string;
  recommendationScope: "SAME_PROVIDER" | "CROSS_PROVIDER";
  estimatedSavingsUsd: number;
  estimatedSavingsPercent: number;
  qualityThreshold: number;
  riskLevel: TaskRiskLevel;
  optimizationGoal: OptimizationGoal;
  traceCount: number;
  currentAverageCostUsd: number;
  currentAverageLatencyMs: number;
  currentErrorRate: number;
  averageSemanticSimilarity: number | null;
  averageHallucinationRisk: number | null;
};

const defaultTaskProfile = (taskName: string): TaskProfileForRecommendation => ({
  taskName,
  riskLevel: "MEDIUM",
  qualityThreshold: 0.8,
  optimizationGoal: "BALANCED"
});

function maxHallucinationRisk(riskLevel: TaskRiskLevel) {
  if (riskLevel === "HIGH") {
    return 0.15;
  }
  if (riskLevel === "LOW") {
    return 0.35;
  }
  return 0.25;
}

function isTaskHealthy(point: TaskModelAnalyticsPoint, profile: TaskProfileForRecommendation) {
  if (point.traceCount < 5 || point.errorRate > 0.02) {
    return false;
  }
  if (point.averageSemanticSimilarity !== null && point.averageSemanticSimilarity < profile.qualityThreshold) {
    return false;
  }
  if (point.averageHallucinationRisk !== null && point.averageHallucinationRisk > maxHallucinationRisk(profile.riskLevel)) {
    return false;
  }
  return true;
}

export function findRecommendationCandidates(
  analytics: TaskModelAnalyticsPoint[],
  catalog: ModelCatalogDto[],
  profiles: TaskProfileForRecommendation[] = [],
  configuredProviders: Set<string> = new Set()
) {
  const catalogForSelection = catalog.map((entry) => ({
    provider: entry.provider,
    model: entry.model,
    status: entry.status,
    capabilities: entry.capabilities,
    inputTokenPricePer1M: entry.inputTokenPricePer1M,
    outputTokenPricePer1M: entry.outputTokenPricePer1M,
    contextWindow: entry.contextWindow
  }));

  const catalogByModel = new Map(catalog.map((entry) => [`${entry.provider}:${entry.model}`, entry]));
  const profilesByTask = new Map(profiles.map((profile) => [profile.taskName, profile]));

  return analytics.flatMap((point): RecommendationCandidate[] => {
    const currentModel = catalogByModel.get(`${point.provider}:${point.model}`);
    if (!currentModel) {
      return [];
    }

    const profile = profilesByTask.get(point.taskName) ?? defaultTaskProfile(point.taskName);
    if (!isTaskHealthy(point, profile)) {
      return [];
    }

    const selected = selectRecommendationCandidate(
      {
        taskName: point.taskName,
        provider: point.provider,
        model: point.model,
        traceCount: point.traceCount,
        totalCostUsd: point.totalCostUsd,
        averageCostUsd: point.averageCostUsd,
        averageLatencyMs: point.averageLatencyMs,
        errorRate: point.errorRate,
        averageSemanticSimilarity: point.averageSemanticSimilarity,
        averageHallucinationRisk: point.averageHallucinationRisk
      },
      {
        provider: currentModel.provider,
        model: currentModel.model,
        status: currentModel.status,
        capabilities: currentModel.capabilities,
        inputTokenPricePer1M: currentModel.inputTokenPricePer1M,
        outputTokenPricePer1M: currentModel.outputTokenPricePer1M,
        contextWindow: currentModel.contextWindow
      },
      catalogForSelection,
      { configuredProviders }
    );

    if (!selected) {
      return [];
    }

    return [
      {
        ...selected,
        qualityThreshold: profile.qualityThreshold,
        riskLevel: profile.riskLevel,
        optimizationGoal: profile.optimizationGoal
      }
    ];
  });
}
