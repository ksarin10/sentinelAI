import type { ModelLifecycleStatus } from "../model-catalog";
import { catalogSupportsCapabilities, inferRequiredCapabilities } from "./capability-match";

export type RecommendationScope = "SAME_PROVIDER" | "CROSS_PROVIDER";

export type CatalogModelForRecommendation = {
  provider: string;
  model: string;
  status: string;
  capabilities: string[];
  inputTokenPricePer1M: number;
  outputTokenPricePer1M: number;
  contextWindow?: number | null;
};

export type RecommendationCandidateInput = {
  taskName: string;
  provider: string;
  model: string;
  traceCount: number;
  totalCostUsd: number;
  averageCostUsd: number;
  averageLatencyMs: number;
  errorRate: number;
  averageSemanticSimilarity: number | null;
  averageHallucinationRisk: number | null;
};

export type SelectedRecommendationCandidate = {
  taskName: string;
  currentProvider: string;
  currentModel: string;
  recommendedProvider: string;
  recommendedModel: string;
  recommendationScope: RecommendationScope;
  estimatedSavingsUsd: number;
  estimatedSavingsPercent: number;
  traceCount: number;
  currentAverageCostUsd: number;
  currentAverageLatencyMs: number;
  currentErrorRate: number;
  averageSemanticSimilarity: number | null;
  averageHallucinationRisk: number | null;
};

export type RecommendationSelectionOptions = {
  /** Providers the customer has connected API keys for (policy C). */
  configuredProviders: Set<string>;
  /** Cross-provider must beat same-provider savings by this factor (policy B). Default 1.2 = 20% better. */
  crossProviderSavingsMultiplier?: number;
};

const ACTIVE: ModelLifecycleStatus = "ACTIVE";

function blendedTokenPrice(model: Pick<CatalogModelForRecommendation, "inputTokenPricePer1M" | "outputTokenPricePer1M">) {
  return (model.inputTokenPricePer1M + model.outputTokenPricePer1M) / 2;
}

function modelFamilyKey(provider: string, model: string) {
  const normalized = model.toLowerCase();
  if (provider === "openai") {
    if (normalized.startsWith("gpt-4.1")) return "gpt-4.1";
    if (normalized.startsWith("gpt-4o")) return "gpt-4o";
    if (normalized.startsWith("gpt-3.5")) return "gpt-3.5";
    if (normalized.startsWith("o1")) return "o1";
    if (normalized.startsWith("o3")) return "o3";
  }
  if (provider === "anthropic") {
    if (normalized.includes("haiku")) return "haiku";
    if (normalized.includes("sonnet")) return "sonnet";
    if (normalized.includes("opus")) return "opus";
  }
  if (provider === "google") {
    if (normalized.includes("flash-lite")) return "flash-lite";
    if (normalized.includes("flash")) return "flash";
    if (normalized.includes("pro")) return "pro";
  }
  return normalized.split("-").slice(0, 2).join("-");
}

function pickPreferredOption(
  options: Array<{ candidate: CatalogModelForRecommendation; price: number }>,
  current: CatalogModelForRecommendation
) {
  if (options.length === 0) {
    return undefined;
  }

  const family = modelFamilyKey(current.provider, current.model);
  const inFamily = options.filter((entry) => modelFamilyKey(entry.candidate.provider, entry.candidate.model) === family);
  return inFamily[0] ?? options[0];
}

function isChatCompletionModel(candidate: CatalogModelForRecommendation) {
  if (candidate.outputTokenPricePer1M <= 0) {
    return false;
  }
  return !candidate.model.toLowerCase().includes("embedding");
}

function cheaperCandidates(
  catalog: CatalogModelForRecommendation[],
  current: CatalogModelForRecommendation,
  currentPrice: number,
  requiredCapabilities: ReturnType<typeof inferRequiredCapabilities>,
  configuredProviders: Set<string>,
  sameProviderOnly: boolean
) {
  return catalog
    .filter((candidate) => (sameProviderOnly ? candidate.provider === current.provider : candidate.provider !== current.provider))
    .filter((candidate) => candidate.model !== current.model)
    .filter((candidate) => candidate.status === ACTIVE)
    .filter((candidate) => isChatCompletionModel(candidate))
    .filter((candidate) => sameProviderOnly || configuredProviders.has(candidate.provider))
    .filter((candidate) => catalogSupportsCapabilities(candidate, requiredCapabilities))
    .map((candidate) => ({ candidate, price: blendedTokenPrice(candidate) }))
    .filter(({ price }) => price > 0 && price < currentPrice)
    .sort((a, b) => a.price - b.price);
}

export function selectRecommendationCandidate(
  point: RecommendationCandidateInput,
  currentModel: CatalogModelForRecommendation,
  catalog: CatalogModelForRecommendation[],
  options: RecommendationSelectionOptions
): SelectedRecommendationCandidate | null {
  const configuredProviders = options.configuredProviders;
  const crossMultiplier = options.crossProviderSavingsMultiplier ?? 1.2;

  const currentPrice = blendedTokenPrice(currentModel);
  const required = inferRequiredCapabilities(point.taskName, currentModel);

  const sameProviderOptions = cheaperCandidates(catalog, currentModel, currentPrice, required, configuredProviders, true);
  const crossProviderOptions = cheaperCandidates(catalog, currentModel, currentPrice, required, configuredProviders, false);

  const bestSame = pickPreferredOption(sameProviderOptions, currentModel);
  const bestCross = crossProviderOptions[0];

  const savingsFraction = (price: number) => 1 - price / currentPrice;

  let choice = bestSame;
  let scope: RecommendationScope = "SAME_PROVIDER";

  if (bestCross) {
    const crossSavings = savingsFraction(bestCross.price);
    const sameSavings = bestSame ? savingsFraction(bestSame.price) : 0;
    const crossWins =
      !bestSame || crossSavings >= sameSavings * crossMultiplier;

    if (crossWins) {
      choice = bestCross;
      scope = "CROSS_PROVIDER";
    }
  }

  if (!choice) {
    return null;
  }

  const savingsPercent = savingsFraction(choice.price) * 100;
  const estimatedSavingsUsd = point.totalCostUsd * (savingsPercent / 100);

  return {
    taskName: point.taskName,
    currentProvider: point.provider,
    currentModel: point.model,
    recommendedProvider: choice.candidate.provider,
    recommendedModel: choice.candidate.model,
    recommendationScope: scope,
    estimatedSavingsUsd: Number(estimatedSavingsUsd.toFixed(6)),
    estimatedSavingsPercent: Number(savingsPercent.toFixed(1)),
    traceCount: point.traceCount,
    currentAverageCostUsd: Number(point.averageCostUsd.toFixed(6)),
    currentAverageLatencyMs: point.averageLatencyMs,
    currentErrorRate: point.errorRate,
    averageSemanticSimilarity: point.averageSemanticSimilarity,
    averageHallucinationRisk: point.averageHallucinationRisk
  };
}
