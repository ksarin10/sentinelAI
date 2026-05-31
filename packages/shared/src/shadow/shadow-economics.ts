import { isCrossProviderRecommendation, isShadowReplayProvider } from "./provider-replay-support";

export type ShadowEconomicsConfig = {
  maxReplaysPerExperiment: number;
  maxExperimentsPerProjectPerDay: number;
  maxReplayCallsPerProjectPerDay: number;
  minSavingsUsd: number;
  earlyStopFailures: number;
};

export function readShadowEconomicsConfig(env: NodeJS.ProcessEnv = process.env): ShadowEconomicsConfig {
  const maxReplays = Number(env.SHADOW_MAX_REPLAYS_PER_EXPERIMENT ?? 8);
  const maxDaily = Number(env.SHADOW_MAX_EXPERIMENTS_PER_PROJECT_PER_DAY ?? 12);
  const maxCalls = Number(env.SHADOW_MAX_REPLAY_CALLS_PER_PROJECT_PER_DAY ?? 96);
  const minSavings = Number(env.SHADOW_MIN_SAVINGS_USD ?? 1);
  const earlyStop = Number(env.SHADOW_EARLY_STOP_FAILURES ?? 5);

  const maxReplaysPerExperiment = Number.isFinite(maxReplays) && maxReplays > 0 ? maxReplays : 8;
  const maxExperimentsPerProjectPerDay = Number.isFinite(maxDaily) && maxDaily > 0 ? maxDaily : 12;
  const maxReplayCallsPerProjectPerDay =
    Number.isFinite(maxCalls) && maxCalls > 0 ? maxCalls : maxReplaysPerExperiment * maxExperimentsPerProjectPerDay;

  return {
    maxReplaysPerExperiment,
    maxExperimentsPerProjectPerDay,
    maxReplayCallsPerProjectPerDay,
    minSavingsUsd: Number.isFinite(minSavings) && minSavings >= 0 ? minSavings : 1,
    earlyStopFailures: Number.isFinite(earlyStop) && earlyStop > 0 ? earlyStop : 5
  };
};

export type ShadowVerificationPlan = {
  canRun: boolean;
  reason: string | null;
};

export function planShadowVerification(input: {
  baselineProvider: string;
  candidateProvider: string;
  candidateProviderHasKey: boolean;
  shadowReplayMode: "api" | "simulate";
}) {
  const cross = isCrossProviderRecommendation(input.baselineProvider, input.candidateProvider);
  const candidate = input.candidateProvider.toLowerCase();

  if (!isShadowReplayProvider(candidate)) {
    return {
      canRun: false,
      reason: `Shadow replay is not implemented for ${candidate} yet.`
    } satisfies ShadowVerificationPlan;
  }

  if (cross) {
    if (input.shadowReplayMode !== "api") {
      return {
        canRun: false,
        reason: "Cross-provider verification requires SHADOW_REPLAY_MODE=api (customer-owned API calls)."
      };
    }
    if (!input.candidateProviderHasKey) {
      return {
        canRun: false,
        reason: `Add a ${candidate} API key under Project settings to verify this cross-provider switch.`
      };
    }
    return { canRun: true, reason: null } satisfies ShadowVerificationPlan;
  }

  if (input.shadowReplayMode === "api" && !input.candidateProviderHasKey) {
    return {
      canRun: false,
      reason: `Add a ${candidate} API key to run live same-provider shadow replay.`
    };
  }

  return { canRun: true, reason: null } satisfies ShadowVerificationPlan;
}

/** Rough upper bound for customer spend per experiment (for UI transparency). */
export function estimateMaxReplayCostUsd(
  maxReplays: number,
  averagePromptTokens = 200,
  averageCompletionTokens = 150,
  inputPricePer1M: number,
  outputPricePer1M: number
) {
  const inputCost = (averagePromptTokens / 1_000_000) * inputPricePer1M * maxReplays;
  const outputCost = (averageCompletionTokens / 1_000_000) * outputPricePer1M * maxReplays;
  return Number((inputCost + outputCost).toFixed(4));
}
