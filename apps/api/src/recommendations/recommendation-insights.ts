import { TaskModelAnalyticsPoint } from "../analytics/task-model-analytics";
import { ModelRecommendation } from "../shadow-experiments/shadow-experiment-engine";
import { RecommendationCandidate } from "./recommendation-candidates";

export type RecommendationEmptyReason =
  | "NO_TRACES"
  | "INSUFFICIENT_TRACES"
  | "TASK_UNHEALTHY"
  | "NO_PROVIDER_KEYS"
  | "NO_CHEAPER_CANDIDATE"
  | "EXPERIMENTS_RUNNING"
  | "EXPERIMENTS_FAILED"
  | "AWAITING_VERIFICATION";

export type RecommendationInsights = {
  reason: RecommendationEmptyReason | null;
  message: string;
  pendingExperiments: number;
  failedExperiments: number;
  candidateCount: number;
};

type InsightInput = {
  traceCount: number;
  analytics: TaskModelAnalyticsPoint[];
  candidates: RecommendationCandidate[];
  configuredProviders: Set<string>;
  pendingExperiments: number;
  failedExperiments: number;
};

function taskHasEnoughTraces(analytics: TaskModelAnalyticsPoint[]) {
  const byTask = new Map<string, number>();
  for (const point of analytics) {
    byTask.set(point.taskName, (byTask.get(point.taskName) ?? 0) + point.traceCount);
  }
  return [...byTask.values()].some((count) => count >= 5);
}

function mayNeedCrossProviderKeys(
  analytics: TaskModelAnalyticsPoint[],
  candidates: RecommendationCandidate[],
  configuredProviders: Set<string>
) {
  if (candidates.length > 0) {
    return false;
  }
  const providersInUse = new Set(analytics.map((point) => point.provider));
  return providersInUse.size > 0 && configuredProviders.size === 0;
}

export function buildRecommendationInsights(
  recommendations: ModelRecommendation[],
  input: InsightInput
): RecommendationInsights {
  const base = {
    pendingExperiments: input.pendingExperiments,
    failedExperiments: input.failedExperiments,
    candidateCount: input.candidates.length
  };

  if (recommendations.length > 0) {
    return {
      ...base,
      reason: null,
      message: "Verified recommendations are ready."
    };
  }

  if (input.traceCount === 0) {
    return {
      ...base,
      reason: "NO_TRACES",
      message: "Ingest LLM traces to start cost and quality analysis."
    };
  }

  if (!taskHasEnoughTraces(input.analytics)) {
    return {
      ...base,
      reason: "INSUFFICIENT_TRACES",
      message: "Send at least 5 successful traces per task before recommendations can run."
    };
  }

  if (input.pendingExperiments > 0) {
    return {
      ...base,
      reason: "EXPERIMENTS_RUNNING",
      message: "Background shadow verification is running on sampled traffic."
    };
  }

  if (input.failedExperiments > 0 && input.candidates.length > 0) {
    return {
      ...base,
      reason: "EXPERIMENTS_FAILED",
      message: "Shadow verification failed. Check provider keys, quality thresholds, and recent trace health."
    };
  }

  if (input.candidates.length > 0) {
    return {
      ...base,
      reason: "AWAITING_VERIFICATION",
      message: "A cheaper candidate was identified and is waiting for shadow verification to finish."
    };
  }

  if (mayNeedCrossProviderKeys(input.analytics, input.candidates, input.configuredProviders)) {
    return {
      ...base,
      reason: "NO_PROVIDER_KEYS",
      message: "Add provider API keys under Project settings to enable cross-provider shadow replay."
    };
  }

  const hasTraffic = input.analytics.some((point) => point.traceCount >= 5);
  if (hasTraffic) {
    return {
      ...base,
      reason: "TASK_UNHEALTHY",
      message: "Recent traces do not meet quality or error-rate gates for your task profiles."
    };
  }

  return {
    ...base,
    reason: "NO_CHEAPER_CANDIDATE",
    message: "No catalog alternative beats your current models with enough estimated savings."
  };
}
