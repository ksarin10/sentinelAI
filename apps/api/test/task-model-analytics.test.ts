import assert from "node:assert/strict";
import { mapTaskModelAnalyticsRow } from "../src/analytics/task-model-analytics";

const mapped = mapTaskModelAnalyticsRow({
  taskName: "ticket.summary",
  provider: "openai",
  model: "gpt-4.1",
  traceCount: BigInt(4),
  averageLatencyMs: "642.4",
  totalTokens: BigInt(1200),
  totalCostUsd: "0.024",
  errorRate: "0.25",
  averageSemanticSimilarity: "0.82",
  averageHallucinationRisk: null
});

assert.deepEqual(mapped, {
  taskName: "ticket.summary",
  provider: "openai",
  model: "gpt-4.1",
  traceCount: 4,
  averageLatencyMs: 642,
  totalTokens: 1200,
  totalCostUsd: 0.024,
  averageCostUsd: 0.006,
  errorRate: 0.25,
  averageSemanticSimilarity: 0.82,
  averageHallucinationRisk: null
});

const emptyCost = mapTaskModelAnalyticsRow({
  taskName: "support.answer",
  provider: "anthropic",
  model: "claude-sonnet-4.6",
  traceCount: 0,
  averageLatencyMs: null,
  totalTokens: null,
  totalCostUsd: null,
  errorRate: null,
  averageSemanticSimilarity: null,
  averageHallucinationRisk: null
});

assert.equal(emptyCost.averageCostUsd, 0);
assert.equal(emptyCost.averageLatencyMs, 0);
