import type { ModelCatalogEntry, ModelCatalogSource, ModelCapability, ModelLifecycleStatus } from "../model-catalog";

export const CATALOG_VERSION = "2026-05-24";

type CatalogEntryInput = {
  provider: string;
  model: string;
  displayName: string;
  status?: ModelLifecycleStatus;
  replacementProvider?: string;
  replacementModel?: string;
  retirementDate?: string;
  inputTokenPricePer1M: number;
  outputTokenPricePer1M: number;
  contextWindow?: number;
  capabilities: ModelCapability[];
  notes?: string;
  source?: ModelCatalogSource;
  sourceUrl?: string;
  confidence?: number;
};

export function defineCatalogEntry(input: CatalogEntryInput): ModelCatalogEntry {
  return {
    provider: input.provider,
    model: input.model,
    displayName: input.displayName,
    status: input.status ?? "ACTIVE",
    replacementProvider: input.replacementProvider,
    replacementModel: input.replacementModel,
    retirementDate: input.retirementDate,
    inputTokenPricePer1M: input.inputTokenPricePer1M,
    outputTokenPricePer1M: input.outputTokenPricePer1M,
    contextWindow: input.contextWindow,
    capabilities: input.capabilities,
    notes: input.notes,
    source: input.source ?? "PROVIDER_DOCS",
    sourceUrl: input.sourceUrl,
    confidence: input.confidence ?? 0.92,
    catalogUpdatedAt: CATALOG_VERSION
  };
}
