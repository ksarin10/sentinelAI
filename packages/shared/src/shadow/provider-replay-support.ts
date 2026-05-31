export const SHADOW_REPLAY_PROVIDERS = ["openai", "anthropic", "google", "groq", "mistral", "cohere"] as const;

export type ShadowReplayProvider = (typeof SHADOW_REPLAY_PROVIDERS)[number];

export function isShadowReplayProvider(provider: string): provider is ShadowReplayProvider {
  return (SHADOW_REPLAY_PROVIDERS as readonly string[]).includes(provider.toLowerCase());
}

export function isCrossProviderRecommendation(baselineProvider: string, candidateProvider: string) {
  return baselineProvider.toLowerCase() !== candidateProvider.toLowerCase();
}

export type ProviderCapabilityStatus = {
  provider: ShadowReplayProvider;
  catalogSupported: boolean;
  shadowReplaySupported: boolean;
  keyConfigured: boolean;
  canVerifyCrossProvider: boolean;
  canVerifySameProviderSimulate: boolean;
};

export function buildProviderCapabilityMatrix(
  configuredProviders: Set<string>,
  shadowReplayMode: "api" | "simulate"
) {
  return SHADOW_REPLAY_PROVIDERS.map((provider): ProviderCapabilityStatus => {
    const keyConfigured = configuredProviders.has(provider);
    return {
      provider,
      catalogSupported: true,
      shadowReplaySupported: true,
      keyConfigured,
      canVerifyCrossProvider: keyConfigured && shadowReplayMode === "api",
      canVerifySameProviderSimulate: shadowReplayMode === "simulate" || keyConfigured
    };
  });
}
