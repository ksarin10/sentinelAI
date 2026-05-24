import { TaskRiskLevel } from "@prisma/client";
import { RecommendationCandidate } from "../recommendations/recommendation-candidates";
import { ModelCatalogDto } from "../model-catalog/model-catalog.dto";

export type PassedShadowExperiment = {
  taskName: string;
  baselineProvider: string;
  baselineModel: string;
  candidateProvider: string;
  candidateModel: string;
  passedRuns: number;
  failedRuns: number;
  averageCandidateSemantic: number | null;
  averageCandidateHallucination: number | null;
  estimatedSavingsPercent: number | null;
  qualityThreshold: number;
};

export type ModelRecommendation = {
  taskName: string;
  currentProvider: string;
  currentModel: string;
  recommendedProvider: string;
  recommendedModel: string;
  recommendationType: "REDUCE_COST";
  confidence: "LOW" | "MEDIUM" | "HIGH";
  estimatedSavingsUsd: number;
  estimatedSavingsPercent: number;
  rationale: string[];
  signals: {
    traceCount: number;
    currentAverageCostUsd: number;
    currentAverageLatencyMs: number;
    currentErrorRate: number;
    averageSemanticSimilarity: number | null;
    averageHallucinationRisk: number | null;
    qualityThreshold: number;
    riskLevel: TaskRiskLevel;
    optimizationGoal: string;
    verifiedRuns: number;
  };
};

function recommendationConfidence(passedRuns: number, riskLevel: TaskRiskLevel): ModelRecommendation["confidence"] {
  if (passedRuns >= 20 && riskLevel === "LOW") {
    return "HIGH";
  }
  if (passedRuns >= 8 && riskLevel !== "HIGH") {
    return "MEDIUM";
  }
  return "LOW";
}

function experimentKey(experiment: Pick<PassedShadowExperiment, "taskName" | "baselineProvider" | "baselineModel" | "candidateProvider" | "candidateModel">) {
  return `${experiment.taskName}:${experiment.baselineProvider}:${experiment.baselineModel}:${experiment.candidateProvider}:${experiment.candidateModel}`;
}

export function buildVerifiedRecommendations(
  candidates: RecommendationCandidate[],
  passedExperiments: PassedShadowExperiment[],
  catalog: ModelCatalogDto[]
) {
  const catalogByModel = new Map(catalog.map((entry) => [`${entry.provider}:${entry.model}`, entry]));
  const passedByKey = new Map(passedExperiments.map((experiment) => [experimentKey(experiment), experiment]));

  return candidates.flatMap((candidate): ModelRecommendation[] => {
    const passed = passedByKey.get(
      experimentKey({
        taskName: candidate.taskName,
        baselineProvider: candidate.currentProvider,
        baselineModel: candidate.currentModel,
        candidateProvider: candidate.recommendedProvider,
        candidateModel: candidate.recommendedModel
      })
    );

    if (!passed) {
      return [];
    }

    const currentModel = catalogByModel.get(`${candidate.currentProvider}:${candidate.currentModel}`);
    const recommendedModel = catalogByModel.get(`${candidate.recommendedProvider}:${candidate.recommendedModel}`);
    if (!currentModel || !recommendedModel) {
      return [];
    }

    const savingsPercent = passed.estimatedSavingsPercent ?? candidate.estimatedSavingsPercent;

    return [
      {
        taskName: candidate.taskName,
        currentProvider: candidate.currentProvider,
        currentModel: candidate.currentModel,
        recommendedProvider: candidate.recommendedProvider,
        recommendedModel: candidate.recommendedModel,
        recommendationType: "REDUCE_COST",
        confidence: recommendationConfidence(passed.passedRuns, candidate.riskLevel),
        estimatedSavingsUsd: candidate.estimatedSavingsUsd,
        estimatedSavingsPercent: savingsPercent,
        rationale: [
          `${recommendedModel.displayName} was verified against recent ${candidate.taskName} traffic in the background.`,
          `Shadow checks passed on ${passed.passedRuns} sampled calls while staying above your quality threshold.`,
          `Estimated savings remain about ${savingsPercent}% versus ${currentModel.displayName}.`
        ],
        signals: {
          traceCount: candidate.traceCount,
          currentAverageCostUsd: candidate.currentAverageCostUsd,
          currentAverageLatencyMs: candidate.currentAverageLatencyMs,
          currentErrorRate: candidate.currentErrorRate,
          averageSemanticSimilarity: candidate.averageSemanticSimilarity,
          averageHallucinationRisk: candidate.averageHallucinationRisk,
          qualityThreshold: candidate.qualityThreshold,
          riskLevel: candidate.riskLevel,
          optimizationGoal: candidate.optimizationGoal,
          verifiedRuns: passed.passedRuns
        }
      }
    ];
  });
}
