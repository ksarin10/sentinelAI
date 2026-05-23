export type TaskModelAnalyticsRow = {
  taskName: string;
  provider: string;
  model: string;
  traceCount: bigint | number;
  averageLatencyMs: number | string | null;
  totalTokens: bigint | number | null;
  totalCostUsd: string | number | null;
  errorRate: number | string | null;
  averageSemanticSimilarity: number | string | null;
  averageHallucinationRisk: number | string | null;
};

export type TaskModelAnalyticsPoint = {
  taskName: string;
  provider: string;
  model: string;
  traceCount: number;
  averageLatencyMs: number;
  totalTokens: number;
  totalCostUsd: number;
  averageCostUsd: number;
  errorRate: number;
  averageSemanticSimilarity: number | null;
  averageHallucinationRisk: number | null;
};

function nullableNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }
  return Number(value);
}

export function mapTaskModelAnalyticsRow(row: TaskModelAnalyticsRow): TaskModelAnalyticsPoint {
  const traceCount = Number(row.traceCount);
  const totalCostUsd = Number(row.totalCostUsd ?? 0);

  return {
    taskName: row.taskName,
    provider: row.provider,
    model: row.model,
    traceCount,
    averageLatencyMs: Math.round(Number(row.averageLatencyMs ?? 0)),
    totalTokens: Number(row.totalTokens ?? 0),
    totalCostUsd,
    averageCostUsd: traceCount === 0 ? 0 : totalCostUsd / traceCount,
    errorRate: Number(row.errorRate ?? 0),
    averageSemanticSimilarity: nullableNumber(row.averageSemanticSimilarity),
    averageHallucinationRisk: nullableNumber(row.averageHallucinationRisk)
  };
}
