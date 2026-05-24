import assert from "node:assert/strict";
import { TaskModelAnalyticsPoint } from "../src/analytics/task-model-analytics";
import { ModelCatalogDto } from "../src/model-catalog/model-catalog.dto";
import { findRecommendationCandidates } from "../src/recommendations/recommendation-candidates";
import { buildVerifiedRecommendations } from "../src/shadow-experiments/shadow-experiment-engine";

const catalog: ModelCatalogDto[] = [
  {
    id: "model_expensive",
    provider: "openai",
    model: "gpt-4.1",
    displayName: "GPT-4.1",
    status: "ACTIVE",
    replacementProvider: null,
    replacementModel: null,
    retirementDate: null,
    inputTokenPricePer1M: 2,
    outputTokenPricePer1M: 8,
    contextWindow: 1047576,
    capabilities: ["text", "json"],
    notes: null,
    catalogUpdatedAt: "2026-05-23T00:00:00.000Z"
  },
  {
    id: "model_cheap",
    provider: "openai",
    model: "gpt-4.1-mini",
    displayName: "GPT-4.1 mini",
    status: "ACTIVE",
    replacementProvider: null,
    replacementModel: null,
    retirementDate: null,
    inputTokenPricePer1M: 0.4,
    outputTokenPricePer1M: 1.6,
    contextWindow: 1047576,
    capabilities: ["text", "json"],
    notes: null,
    catalogUpdatedAt: "2026-05-23T00:00:00.000Z"
  }
];

const healthyTask: TaskModelAnalyticsPoint = {
  taskName: "support.answer",
  provider: "openai",
  model: "gpt-4.1",
  traceCount: 25,
  averageLatencyMs: 920,
  totalTokens: 100000,
  totalCostUsd: 0.5,
  averageCostUsd: 0.02,
  errorRate: 0,
  averageSemanticSimilarity: 0.86,
  averageHallucinationRisk: 0.08
};

const candidates = findRecommendationCandidates(
  [healthyTask],
  catalog,
  [
    {
      taskName: "support.answer",
      riskLevel: "MEDIUM",
      qualityThreshold: 0.8,
      optimizationGoal: "REDUCE_COST"
    }
  ],
  new Set(["openai"])
);

assert.equal(candidates.length, 1);
assert.equal(candidates[0].recommendedModel, "gpt-4.1-mini");

const verified = buildVerifiedRecommendations(candidates, [], catalog);
assert.equal(verified.length, 0);

const verifiedAfterExperiment = buildVerifiedRecommendations(
  candidates,
  [
    {
      taskName: "support.answer",
      baselineProvider: "openai",
      baselineModel: "gpt-4.1",
      candidateProvider: "openai",
      candidateModel: "gpt-4.1-mini",
      passedRuns: 8,
      failedRuns: 1,
      averageCandidateSemantic: 0.84,
      averageCandidateHallucination: 0.09,
      estimatedSavingsPercent: 80,
      qualityThreshold: 0.8
    }
  ],
  catalog
);

assert.equal(verifiedAfterExperiment.length, 1);
assert.equal(verifiedAfterExperiment[0].signals.verifiedRuns, 8);
assert.match(verifiedAfterExperiment[0].rationale[0], /verified against recent support.answer traffic/i);

const weakQualityCandidates = findRecommendationCandidates(
  [{ ...healthyTask, averageSemanticSimilarity: 0.6 }],
  catalog,
  [{ taskName: "support.answer", riskLevel: "MEDIUM", qualityThreshold: 0.8, optimizationGoal: "REDUCE_COST" }],
  new Set(["openai"])
);

assert.equal(weakQualityCandidates.length, 0);
