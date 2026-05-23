import assert from "node:assert/strict";
import { TaskModelAnalyticsPoint } from "../src/analytics/task-model-analytics";
import { ModelCatalogDto } from "../src/model-catalog/model-catalog.dto";
import { buildModelMigrationReports } from "../src/model-migrations/model-migration-report";

const analytics: TaskModelAnalyticsPoint[] = [
  {
    taskName: "support.answer",
    provider: "anthropic",
    model: "claude-sonnet-4.5",
    traceCount: 12,
    averageLatencyMs: 1100,
    totalTokens: 42000,
    totalCostUsd: 0.63,
    averageCostUsd: 0.0525,
    errorRate: 0,
    averageSemanticSimilarity: 0.84,
    averageHallucinationRisk: 0.12
  },
  {
    taskName: "sales.email",
    provider: "anthropic",
    model: "claude-sonnet-4.5",
    traceCount: 8,
    averageLatencyMs: 980,
    totalTokens: 16000,
    totalCostUsd: 0.24,
    averageCostUsd: 0.03,
    errorRate: 0,
    averageSemanticSimilarity: 0.81,
    averageHallucinationRisk: 0.1
  }
];

const catalog: ModelCatalogDto[] = [
  {
    id: "retiring",
    provider: "anthropic",
    model: "claude-sonnet-4.5",
    displayName: "Claude Sonnet 4.5",
    status: "RETIRING",
    replacementProvider: "anthropic",
    replacementModel: "claude-sonnet-4.6",
    retirementDate: "2026-09-01T00:00:00.000Z",
    inputTokenPricePer1M: 3,
    outputTokenPricePer1M: 15,
    contextWindow: 200000,
    capabilities: ["text", "json"],
    notes: null,
    catalogUpdatedAt: "2026-05-23T00:00:00.000Z"
  },
  {
    id: "replacement",
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

const reports = buildModelMigrationReports(analytics, catalog, new Date("2026-06-15T00:00:00.000Z"));

assert.equal(reports.length, 1);
assert.equal(reports[0].readiness, "NEEDS_REPLACEMENT");
assert.equal(reports[0].daysUntilRetirement, 78);
assert.equal(reports[0].totalTraceCount, 20);
assert.equal(reports[0].totalCostUsd, 0.87);
assert.equal(reports[0].affectedTasks.length, 2);
assert.equal(reports[0].replacementModel, "claude-sonnet-4.6");

const blockedReports = buildModelMigrationReports(
  analytics,
  [{ ...catalog[0], replacementProvider: null, replacementModel: null }],
  new Date("2026-06-15T00:00:00.000Z")
);

assert.equal(blockedReports[0].readiness, "BLOCKED");
