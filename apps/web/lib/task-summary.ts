import type { TaskModelAnalyticsPoint } from "@sentinelai/shared";
import type { ModelRecommendationRecord, VerificationRecord } from "./types";

export type TaskSummaryRow = {
  taskName: string;
  provider: string;
  model: string;
  traceCount: number;
  averageCostUsd: number;
  averageLatencyMs: number;
  totalCostUsd: number;
  recommendation: ModelRecommendationRecord | null;
  verification: VerificationRecord | null;
  statusLabel: string;
};

export function buildTaskSummaries(
  taskModels: TaskModelAnalyticsPoint[],
  recommendations: ModelRecommendationRecord[],
  verifications: VerificationRecord[]
): TaskSummaryRow[] {
  const byTask = new Map<string, TaskModelAnalyticsPoint[]>();
  for (const point of taskModels) {
    const list = byTask.get(point.taskName) ?? [];
    list.push(point);
    byTask.set(point.taskName, list);
  }

  return [...byTask.entries()].map(([taskName, points]) => {
    const primary = points.sort((a, b) => b.totalCostUsd - a.totalCostUsd)[0];
    const recommendation =
      recommendations.find((item) => item.taskName === taskName) ??
      null;
    const verification =
      verifications.find(
        (item) =>
          item.taskName === taskName &&
          item.currentModel === primary.model &&
          item.candidateModel === recommendation?.recommendedModel
      ) ??
      verifications.find((item) => item.taskName === taskName) ??
      null;

    let statusLabel = "No obvious downgrade candidate";
    if (verification?.switchStatus === "VERIFYING") {
      statusLabel = "Shadow verification running";
    } else if (recommendation?.switchStatus === "SAFE_TO_SWITCH") {
      statusLabel = "Verified savings opportunity";
    } else if (recommendation?.switchStatus === "NEEDS_REVIEW") {
      statusLabel = "Needs review before switching";
    } else if (recommendation?.switchStatus === "DO_NOT_SWITCH") {
      statusLabel = "Do not switch";
    } else if ((recommendationInsightsPending(verification) || verification?.switchStatus === "NOT_RUN") && recommendation) {
      statusLabel = "Awaiting verification";
    }

    return {
      taskName,
      provider: primary.provider,
      model: primary.model,
      traceCount: points.reduce((sum, point) => sum + point.traceCount, 0),
      averageCostUsd: primary.averageCostUsd,
      averageLatencyMs: primary.averageLatencyMs,
      totalCostUsd: points.reduce((sum, point) => sum + point.totalCostUsd, 0),
      recommendation,
      verification,
      statusLabel
    };
  });
}

function recommendationInsightsPending(verification: VerificationRecord | null) {
  return verification?.experimentStatus === "QUEUED" || verification?.experimentStatus === "RUNNING";
}

export function topExpensiveTask(summaries: TaskSummaryRow[]) {
  return [...summaries].sort((a, b) => b.totalCostUsd - a.totalCostUsd)[0] ?? null;
}

export function estimatedMonthlyCost(totalCostUsd: number, traceCount: number) {
  if (traceCount === 0) {
    return 0;
  }
  const daily = totalCostUsd / Math.max(traceCount, 1);
  return daily * traceCount * 30;
}
