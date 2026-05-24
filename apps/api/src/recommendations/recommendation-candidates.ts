import { ModelLifecycleStatus, OptimizationGoal, TaskRiskLevel } from "@prisma/client";
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

function blendedTokenPrice(model: Pick<ModelCatalogDto, "inputTokenPricePer1M" | "outputTokenPricePer1M">) {
  return (model.inputTokenPricePer1M + model.outputTokenPricePer1M) / 2;
}

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
  profiles: TaskProfileForRecommendation[] = []
) {
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

    const currentPrice = blendedTokenPrice(currentModel);
    const cheaperCandidates = catalog
      .filter((candidate) => candidate.provider === point.provider)
      .filter((candidate) => candidate.model !== point.model)
      .filter((candidate) => candidate.status === ("ACTIVE" satisfies ModelLifecycleStatus))
      .map((candidate) => ({ candidate, price: blendedTokenPrice(candidate) }))
      .filter(({ price }) => price > 0 && price < currentPrice)
      .sort((a, b) => a.price - b.price);

    const bestCandidate = cheaperCandidates[0];
    if (!bestCandidate) {
      return [];
    }

    const savingsPercent = 1 - bestCandidate.price / currentPrice;
    const estimatedSavingsUsd = point.totalCostUsd * savingsPercent;

    return [
      {
        taskName: point.taskName,
        currentProvider: point.provider,
        currentModel: point.model,
        recommendedProvider: bestCandidate.candidate.provider,
        recommendedModel: bestCandidate.candidate.model,
        estimatedSavingsUsd: Number(estimatedSavingsUsd.toFixed(6)),
        estimatedSavingsPercent: Number((savingsPercent * 100).toFixed(1)),
        qualityThreshold: profile.qualityThreshold,
        riskLevel: profile.riskLevel,
        optimizationGoal: profile.optimizationGoal,
        traceCount: point.traceCount,
        currentAverageCostUsd: Number(point.averageCostUsd.toFixed(6)),
        currentAverageLatencyMs: point.averageLatencyMs,
        currentErrorRate: point.errorRate,
        averageSemanticSimilarity: point.averageSemanticSimilarity,
        averageHallucinationRisk: point.averageHallucinationRisk
      }
    ];
  });
}
