import assert from "node:assert/strict";
import { TaskModelAnalyticsPoint } from "../src/analytics/task-model-analytics";
import { ModelCatalogDto } from "../src/model-catalog/model-catalog.dto";
import { buildModelRecommendations } from "../src/recommendations/recommendation-engine";

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
  },
  {
    id: "model_other_provider",
    provider: "anthropic",
    model: "claude-sonnet-4.6",
    displayName: "Claude Sonnet 4.6",
    status: "ACTIVE",
    replacementProvider: null,
    replacementModel: null,
    retirementDate: null,
    inputTokenPricePer1M: 3,
    outputTokenPricePer1M: 15,
    contextWindow: 200000,
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

const recommendations = buildModelRecommendations([healthyTask], catalog, [
  {
    taskName: "support.answer",
    riskLevel: "MEDIUM",
    qualityThreshold: 0.8,
    optimizationGoal: "REDUCE_COST"
  }
]);

assert.equal(recommendations.length, 1);
assert.equal(recommendations[0].recommendedModel, "gpt-4.1-mini");
assert.equal(recommendations[0].estimatedSavingsPercent, 80);
assert.equal(recommendations[0].estimatedSavingsUsd, 0.4);
assert.equal(recommendations[0].confidence, "MEDIUM");

const weakQualityRecommendations = buildModelRecommendations(
  [{ ...healthyTask, averageSemanticSimilarity: 0.6 }],
  catalog,
  [{ taskName: "support.answer", riskLevel: "MEDIUM", qualityThreshold: 0.8, optimizationGoal: "REDUCE_COST" }]
);

assert.equal(weakQualityRecommendations.length, 0);

const lowVolumeRecommendations = buildModelRecommendations([{ ...healthyTask, traceCount: 3 }], catalog);

assert.equal(lowVolumeRecommendations.length, 0);
