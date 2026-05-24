import assert from "node:assert/strict";
import { TaskModelAnalyticsPoint } from "../src/analytics/task-model-analytics";
import { buildRecommendationInsights } from "../src/recommendations/recommendation-insights";
import { RecommendationCandidate } from "../src/recommendations/recommendation-candidates";
import { ModelRecommendation } from "../src/shadow-experiments/shadow-experiment-engine";

const analytics: TaskModelAnalyticsPoint[] = [
  {
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
  }
];

const candidate = {
  taskName: "support.answer",
  currentProvider: "openai",
  currentModel: "gpt-4.1",
  recommendedProvider: "openai",
  recommendedModel: "gpt-4.1-mini",
  recommendationScope: "SAME_PROVIDER",
  estimatedSavingsUsd: 0.4,
  estimatedSavingsPercent: 80,
  qualityThreshold: 0.8,
  riskLevel: "MEDIUM",
  optimizationGoal: "REDUCE_COST",
  traceCount: 25,
  currentAverageCostUsd: 0.02,
  currentAverageLatencyMs: 920,
  currentErrorRate: 0,
  averageSemanticSimilarity: 0.86,
  averageHallucinationRisk: 0.08
} satisfies RecommendationCandidate;

assert.equal(
  buildRecommendationInsights([], { traceCount: 0, analytics: [], candidates: [], configuredProviders: new Set(), pendingExperiments: 0, failedExperiments: 0 })
    .reason,
  "NO_TRACES"
);

assert.equal(
  buildRecommendationInsights([], {
    traceCount: 3,
    analytics: [{ ...analytics[0], traceCount: 3 }],
    candidates: [],
    configuredProviders: new Set(["openai"]),
    pendingExperiments: 0,
    failedExperiments: 0
  }).reason,
  "INSUFFICIENT_TRACES"
);

assert.equal(
  buildRecommendationInsights([], {
    traceCount: 25,
    analytics,
    candidates: [candidate],
    configuredProviders: new Set(["openai"]),
    pendingExperiments: 2,
    failedExperiments: 0
  }).reason,
  "EXPERIMENTS_RUNNING"
);

assert.equal(
  buildRecommendationInsights([], {
    traceCount: 25,
    analytics,
    candidates: [candidate],
    configuredProviders: new Set(["openai"]),
    pendingExperiments: 0,
    failedExperiments: 1
  }).reason,
  "EXPERIMENTS_FAILED"
);

assert.equal(
  buildRecommendationInsights([], {
    traceCount: 25,
    analytics,
    candidates: [candidate],
    configuredProviders: new Set(["openai"]),
    pendingExperiments: 0,
    failedExperiments: 0
  }).reason,
  "AWAITING_VERIFICATION"
);

const recommendation = {
  taskName: "support.answer",
  currentProvider: "openai",
  currentModel: "gpt-4.1",
  recommendedProvider: "openai",
  recommendedModel: "gpt-4.1-mini",
  recommendationType: "REDUCE_COST",
  confidence: "MEDIUM",
  estimatedSavingsUsd: 0.4,
  estimatedSavingsPercent: 80,
  rationale: ["ready"],
  signals: {
    traceCount: 25,
    currentAverageCostUsd: 0.02,
    currentAverageLatencyMs: 920,
    currentErrorRate: 0,
    averageSemanticSimilarity: 0.86,
    averageHallucinationRisk: 0.08,
    qualityThreshold: 0.8,
    riskLevel: "MEDIUM",
    optimizationGoal: "REDUCE_COST",
    verifiedRuns: 8
  }
} satisfies ModelRecommendation;

assert.equal(
  buildRecommendationInsights([recommendation], {
    traceCount: 25,
    analytics,
    candidates: [candidate],
    configuredProviders: new Set(["openai"]),
    pendingExperiments: 0,
    failedExperiments: 0
  }).reason,
  null
);
