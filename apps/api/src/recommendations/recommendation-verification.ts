import {
  buildProviderCapabilityMatrix,
  planShadowVerification,
  type ProviderCapabilityStatus,
  readShadowEconomicsConfig
} from "@sentinelai/shared";
import { RecommendationCandidate } from "./recommendation-candidates";

export type RecommendationSuggestion = RecommendationCandidate & {
  verificationBlockReason: string;
};

export function getShadowReplayModeFromEnv() {
  return process.env.SHADOW_REPLAY_MODE === "simulate" ? "simulate" : "api";
}

export function buildProviderCapabilities(configuredProviders: Set<string>): ProviderCapabilityStatus[] {
  return buildProviderCapabilityMatrix(configuredProviders, getShadowReplayModeFromEnv());
}

export function partitionCandidatesForShadow(
  candidates: RecommendationCandidate[],
  configuredProviders: Set<string>
) {
  const shadowReplayMode = getShadowReplayModeFromEnv();
  const verifiable: RecommendationCandidate[] = [];
  const suggestions: RecommendationSuggestion[] = [];

  for (const candidate of candidates) {
    const plan = planShadowVerification({
      baselineProvider: candidate.currentProvider,
      candidateProvider: candidate.recommendedProvider,
      candidateProviderHasKey: configuredProviders.has(candidate.recommendedProvider),
      shadowReplayMode
    });

    if (plan.canRun) {
      verifiable.push(candidate);
      continue;
    }

    suggestions.push({
      ...candidate,
      verificationBlockReason: plan.reason ?? "Shadow verification is not available for this candidate yet."
    });
  }

  return { verifiable, suggestions };
}

export function readEconomicsForApi() {
  return readShadowEconomicsConfig(process.env);
}
