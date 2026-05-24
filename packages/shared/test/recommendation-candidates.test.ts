import assert from "node:assert/strict";
import { selectRecommendationCandidate } from "../src/recommendations/candidate-selection";

const catalog = [
  {
    provider: "openai",
    model: "gpt-4.1",
    status: "ACTIVE",
    capabilities: ["text", "json"],
    inputTokenPricePer1M: 2,
    outputTokenPricePer1M: 8
  },
  {
    provider: "openai",
    model: "gpt-4.1-mini",
    status: "ACTIVE",
    capabilities: ["text", "json"],
    inputTokenPricePer1M: 0.4,
    outputTokenPricePer1M: 1.6
  },
  {
    provider: "groq",
    model: "llama-3.1-8b-instant",
    status: "ACTIVE",
    capabilities: ["text", "json"],
    inputTokenPricePer1M: 0.05,
    outputTokenPricePer1M: 0.08
  }
];

const point = {
  taskName: "support.answer",
  provider: "openai",
  model: "gpt-4.1",
  traceCount: 25,
  totalCostUsd: 0.5,
  averageCostUsd: 0.02,
  averageLatencyMs: 920,
  errorRate: 0,
  averageSemanticSimilarity: 0.86,
  averageHallucinationRisk: 0.08
};

const current = catalog[0];

const openaiOnly = selectRecommendationCandidate(point, current, catalog, {
  configuredProviders: new Set(["openai"])
});

assert.equal(openaiOnly?.recommendedModel, "gpt-4.1-mini");
assert.equal(openaiOnly?.recommendationScope, "SAME_PROVIDER");

const withGroq = selectRecommendationCandidate(point, current, catalog, {
  configuredProviders: new Set(["openai", "groq"])
});

assert.equal(withGroq?.recommendedProvider, "groq");
assert.equal(withGroq?.recommendationScope, "CROSS_PROVIDER");

assert.equal(
  selectRecommendationCandidate(point, current, catalog, {
    configuredProviders: new Set(["openai"])
  })?.recommendedProvider,
  "openai"
);
