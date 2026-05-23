import { PrismaClient } from "@prisma/client";
import { initialModelCatalog } from "../packages/shared/src/model-catalog";

const prisma = new PrismaClient();

async function main() {
  for (const entry of initialModelCatalog) {
    await prisma.modelCatalog.upsert({
      where: { provider_model: { provider: entry.provider, model: entry.model } },
      update: {
        displayName: entry.displayName,
        status: entry.status,
        replacementProvider: entry.replacementProvider,
        replacementModel: entry.replacementModel,
        retirementDate: entry.retirementDate ? new Date(entry.retirementDate) : null,
        inputTokenPricePer1M: entry.inputTokenPricePer1M,
        outputTokenPricePer1M: entry.outputTokenPricePer1M,
        contextWindow: entry.contextWindow,
        capabilities: entry.capabilities,
        notes: entry.notes,
        catalogUpdatedAt: new Date(entry.catalogUpdatedAt)
      },
      create: {
        provider: entry.provider,
        model: entry.model,
        displayName: entry.displayName,
        status: entry.status,
        replacementProvider: entry.replacementProvider,
        replacementModel: entry.replacementModel,
        retirementDate: entry.retirementDate ? new Date(entry.retirementDate) : null,
        inputTokenPricePer1M: entry.inputTokenPricePer1M,
        outputTokenPricePer1M: entry.outputTokenPricePer1M,
        contextWindow: entry.contextWindow,
        capabilities: entry.capabilities,
        notes: entry.notes,
        catalogUpdatedAt: new Date(entry.catalogUpdatedAt)
      }
    });
  }

  console.log(`Seeded ${initialModelCatalog.length} model catalog entries.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
