import { PrismaClient } from "@prisma/client";
import { seedOptimizationDemo } from "../apps/api/src/demo/seed-optimization-demo";

const prisma = new PrismaClient();

async function main() {
  const projectId = process.env.PROJECT_ID;
  if (!projectId) {
    throw new Error("Set PROJECT_ID to the project you want to seed. Example: PROJECT_ID=clxyz npm run demo:seed");
  }

  const result = await seedOptimizationDemo(prisma, projectId);
  console.log(`Seeded ${result.tracesCreated} mock traces and ${result.catalogEntries} catalog entries for project ${projectId}.`);
  console.log(`Recommendation preview: ${result.recommendationPreview.taskName} ${result.recommendationPreview.currentModel} -> ${result.recommendationPreview.suggestedModel}`);
  console.log(`Migration preview: ${result.migrationPreview.model} -> ${result.migrationPreview.replacementModel}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
