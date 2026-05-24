import { ModelCatalogSource, Prisma, PrismaClient } from "@prisma/client";
import { modelCatalog, type ModelCatalogEntry } from "@sentinelai/shared";

export type SyncModelCatalogResult = {
  synced: number;
  catalogVersion: string;
  providers: string[];
};

function toUpsertData(entry: ModelCatalogEntry, checkedAt: Date) {
  return {
    displayName: entry.displayName,
    status: entry.status,
    replacementProvider: entry.replacementProvider ?? null,
    replacementModel: entry.replacementModel ?? null,
    retirementDate: entry.retirementDate ? new Date(entry.retirementDate) : null,
    inputTokenPricePer1M: entry.inputTokenPricePer1M,
    outputTokenPricePer1M: entry.outputTokenPricePer1M,
    contextWindow: entry.contextWindow ?? null,
    capabilities: entry.capabilities,
    notes: entry.notes ?? null,
    source: (entry.source ?? "PROVIDER_DOCS") as ModelCatalogSource,
    sourceUrl: entry.sourceUrl ?? null,
    confidence: entry.confidence ?? 0.9,
    lastCheckedAt: checkedAt,
    catalogUpdatedAt: new Date(entry.catalogUpdatedAt)
  };
}

export async function syncModelCatalog(
  prisma: PrismaClient | Prisma.TransactionClient,
  entries: ModelCatalogEntry[] = modelCatalog
): Promise<SyncModelCatalogResult> {
  const checkedAt = new Date();

  for (const entry of entries) {
    const data = toUpsertData(entry, checkedAt);
    await prisma.modelCatalog.upsert({
      where: { provider_model: { provider: entry.provider, model: entry.model } },
      update: data,
      create: {
        provider: entry.provider,
        model: entry.model,
        ...data
      }
    });
  }

  const providers = [...new Set(entries.map((entry) => entry.provider))].sort();

  return {
    synced: entries.length,
    catalogVersion: entries[0]?.catalogUpdatedAt ?? checkedAt.toISOString().slice(0, 10),
    providers
  };
}
