import { TaskModelAnalyticsPoint } from "../analytics/task-model-analytics";
import { ModelRecommendation } from "../shadow-experiments/shadow-experiment-engine";
import {
  isTaskHealthy,
  minShadowSavingsUsd,
  RecommendationCandidate,
  TaskProfileForRecommendation
} from "./recommendation-candidates";
import { RecommendationSuggestion } from "./recommendation-verification";

export type RecommendationEmptyReason =
  | "NO_TRACES"
  | "INSUFFICIENT_TRACES"
  | "TASK_UNHEALTHY"
  | "SAVINGS_BELOW_THRESHOLD"
  | "NO_PROVIDER_KEYS"
  | "NO_CHEAPER_CANDIDATE"
  | "EXPERIMENTS_RUNNING"
  | "EXPERIMENTS_FAILED"
  | "AWAITING_VERIFICATION"
  | "SUGGESTIONS_NEED_KEYS";

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
  unfilteredCandidates: RecommendationCandidate[];
  profiles: TaskProfileForRecommendation[];
  configuredProviders: Set<string>;
  pendingExperiments: number;
  failedExperiments: number;
  latestFailedReason?: string | null;
  suggestions?: RecommendationSuggestion[];
};

const defaultTaskProfile = (taskName: string): TaskProfileForRecommendation => ({
  taskName,
  riskLevel: "MEDIUM",
  qualityThreshold: 0.8,
  optimizationGoal: "BALANCED"
});

function hasUnhealthyTraffic(analytics: TaskModelAnalyticsPoint[], profiles: TaskProfileForRecommendation[]) {
  const profilesByTask = new Map(profiles.map((profile) => [profile.taskName, profile]));
  return analytics.some((point) => {
    if (point.traceCount < 5) {
      return false;
    }
    const profile = profilesByTask.get(point.taskName) ?? defaultTaskProfile(point.taskName);
    return !isTaskHealthy(point, profile);
  });
}

function taskHasEnoughTraces(analytics: TaskModelAnalyticsPoint[]) {
  const byTask = new Map<string, number>();
  for (const point of analytics) {
    byTask.set(point.taskName, (byTask.get(point.taskName) ?? 0) + point.traceCount);
  }
  return [...byTask.values()].some((count) => count >= 5);
}

function needsCrossProviderKeys(candidates: RecommendationCandidate[], configuredProviders: Set<string>) {
  return (
    configuredProviders.size === 0 &&
    candidates.some((candidate) => candidate.recommendationScope === "CROSS_PROVIDER")
  );
}

function blockedByMinSavings(candidates: RecommendationCandidate[], unfilteredCandidates: RecommendationCandidate[]) {
  return unfilteredCandidates.length > 0 && candidates.length === 0;
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
    const detail = input.latestFailedReason ? ` Last failure: ${input.latestFailedReason}` : "";
    return {
      ...base,
      reason: "EXPERIMENTS_FAILED",
      message: `Shadow verification failed. Check provider keys, quality thresholds, and recent trace health.${detail}`
    };
  }

  if ((input.suggestions?.length ?? 0) > 0 && input.candidates.length === 0) {
    return {
      ...base,
      reason: "SUGGESTIONS_NEED_KEYS",
      message:
        "Cross-provider savings are available but need provider API keys (and SHADOW_REPLAY_MODE=api) before we run paid verification on your account."
    };
  }

  if (input.candidates.length > 0) {
    return {
      ...base,
      reason: "AWAITING_VERIFICATION",
      message: "A cheaper candidate was identified and is waiting for shadow verification to finish."
    };
  }

  if (blockedByMinSavings(input.candidates, input.unfilteredCandidates)) {
    const floor = minShadowSavingsUsd();
    return {
      ...base,
      reason: "SAVINGS_BELOW_THRESHOLD",
      message: `Projected savings are below the shadow floor ($${floor} estimated). Send more traffic or lower SHADOW_MIN_SAVINGS_USD for local testing.`
    };
  }

  if (hasUnhealthyTraffic(input.analytics, input.profiles)) {
    return {
      ...base,
      reason: "TASK_UNHEALTHY",
      message: "Recent traces do not meet quality or error-rate gates for your task profiles."
    };
  }

  if (needsCrossProviderKeys(input.unfilteredCandidates, input.configuredProviders)) {
    return {
      ...base,
      reason: "NO_PROVIDER_KEYS",
      message: "Add provider API keys under Project settings to verify cross-provider model switches."
    };
  }

  return {
    ...base,
    reason: "NO_CHEAPER_CANDIDATE",
    message: "No catalog alternative beats your current models with enough estimated savings."
  };
}
