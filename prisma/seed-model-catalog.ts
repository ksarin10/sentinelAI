import { PrismaClient } from "@prisma/client";
import { syncModelCatalog } from "../apps/api/src/model-catalog/sync-model-catalog";

const prisma = new PrismaClient();

async function main() {
  const result = await syncModelCatalog(prisma);
  console.log(`Synced ${result.synced} model catalog entries (${result.providers.length} providers).`);
  console.log(`Catalog version: ${result.catalogVersion}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
