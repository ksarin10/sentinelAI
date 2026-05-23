import { ModelCatalog } from "@prisma/client";

export type ModelCatalogDto = {
  id: string;
  provider: string;
  model: string;
  displayName: string;
  status: string;
  replacementProvider: string | null;
  replacementModel: string | null;
  retirementDate: string | null;
  inputTokenPricePer1M: number;
  outputTokenPricePer1M: number;
  contextWindow: number | null;
  capabilities: string[];
  notes: string | null;
  catalogUpdatedAt: string;
};

export function toModelCatalogDto(entry: ModelCatalog): ModelCatalogDto {
  return {
    id: entry.id,
    provider: entry.provider,
    model: entry.model,
    displayName: entry.displayName,
    status: entry.status,
    replacementProvider: entry.replacementProvider,
    replacementModel: entry.replacementModel,
    retirementDate: entry.retirementDate?.toISOString() ?? null,
    inputTokenPricePer1M: Number(entry.inputTokenPricePer1M),
    outputTokenPricePer1M: Number(entry.outputTokenPricePer1M),
    contextWindow: entry.contextWindow,
    capabilities: entry.capabilities,
    notes: entry.notes,
    catalogUpdatedAt: entry.catalogUpdatedAt.toISOString()
  };
}
