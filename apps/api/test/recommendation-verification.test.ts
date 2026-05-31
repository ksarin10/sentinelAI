import assert from "node:assert/strict";
import { partitionCandidatesForShadow } from "../src/recommendations/recommendation-verification";
import { RecommendationCandidate } from "../src/recommendations/recommendation-candidates";

const base = {
  taskName: "support.answer",
  currentProvider: "openai",
  currentModel: "gpt-4.1",
  qualityThreshold: 0.8,
  riskLevel: "MEDIUM" as const,
  optimizationGoal: "REDUCE_COST" as const,
  traceCount: 10,
  currentAverageCostUsd: 0.02,
  currentAverageLatencyMs: 900,
  currentErrorRate: 0,
  averageSemanticSimilarity: 0.86,
  averageHallucinationRisk: 0.08,
  estimatedSavingsUsd: 0.4,
  estimatedSavingsPercent: 80
};

const crossCandidate = {
  ...base,
  recommendedProvider: "groq",
  recommendedModel: "llama-3.3-70b-versatile",
  recommendationScope: "CROSS_PROVIDER" as const
} satisfies RecommendationCandidate;

const originalMode = process.env.SHADOW_REPLAY_MODE;
process.env.SHADOW_REPLAY_MODE = "simulate";

const partitioned = partitionCandidatesForShadow([crossCandidate], new Set());
assert.equal(partitioned.verifiable.length, 0);
assert.equal(partitioned.suggestions.length, 1);

process.env.SHADOW_REPLAY_MODE = "api";
const withKey = partitionCandidatesForShadow([crossCandidate], new Set(["groq"]));
assert.equal(withKey.verifiable.length, 1);

process.env.SHADOW_REPLAY_MODE = originalMode;
