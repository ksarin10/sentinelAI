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

const emptyInsightInput = {
  traceCount: 0,
  analytics: [] as typeof analytics,
  candidates: [] as RecommendationCandidate[],
  unfilteredCandidates: [] as RecommendationCandidate[],
  profiles: [] as Array<{
    taskName: string;
    riskLevel: "MEDIUM";
    qualityThreshold: number;
    optimizationGoal: "REDUCE_COST";
  }>,
  configuredProviders: new Set<string>(),
  pendingExperiments: 0,
  failedExperiments: 0,
  suggestions: []
};

assert.equal(buildRecommendationInsights([], emptyInsightInput).reason, "NO_TRACES");

assert.equal(
  buildRecommendationInsights([], {
    ...emptyInsightInput,
    traceCount: 3,
    analytics: [{ ...analytics[0], traceCount: 3 }]
  }).reason,
  "INSUFFICIENT_TRACES"
);

const withCandidate = {
  traceCount: 25,
  analytics,
  candidates: [candidate],
  unfilteredCandidates: [candidate],
  profiles: [
    {
      taskName: "support.answer",
      riskLevel: "MEDIUM" as const,
      qualityThreshold: 0.8,
      optimizationGoal: "REDUCE_COST" as const
    }
  ],
  configuredProviders: new Set(["openai"]),
  pendingExperiments: 0,
  failedExperiments: 0,
  suggestions: []
};

assert.equal(
  buildRecommendationInsights([], { ...withCandidate, pendingExperiments: 2 }).reason,
  "EXPERIMENTS_RUNNING"
);

assert.equal(
  buildRecommendationInsights([], { ...withCandidate, failedExperiments: 1 }).reason,
  "EXPERIMENTS_FAILED"
);

assert.equal(buildRecommendationInsights([], withCandidate).reason, "AWAITING_VERIFICATION");

assert.equal(
  buildRecommendationInsights([], {
    ...withCandidate,
    candidates: [],
    unfilteredCandidates: [candidate]
  }).reason,
  "SAVINGS_BELOW_THRESHOLD"
);

const recommendation = {
  taskName: "support.answer",
  currentProvider: "openai",
  currentModel: "gpt-4.1",
  recommendedProvider: "openai",
  recommendedModel: "gpt-4.1-mini",
  recommendationScope: "SAME_PROVIDER",
  switchStatus: "SAFE_TO_SWITCH",
  switchStatusLabel: "Safe to switch",
  passRate: 1,
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

assert.equal(buildRecommendationInsights([recommendation], withCandidate).reason, null);
