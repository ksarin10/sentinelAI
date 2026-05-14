import { PrismaClient } from "@prisma/client";
import { Job, Worker } from "bullmq";
import IORedis from "ioredis";
import { hallucinationRisk, semanticSimilarity } from "./scoring";

const prisma = new PrismaClient();
const connection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", { maxRetriesPerRequest: null });

async function runEvaluation(job: Job<{ traceId: string; evaluationId?: string }>) {
  const trace = await prisma.trace.findUnique({ where: { id: job.data.traceId } });
  if (!trace) {
    throw new Error(`Trace ${job.data.traceId} not found`);
  }

  const evaluation =
    job.data.evaluationId
      ? await prisma.evaluation.update({ where: { id: job.data.evaluationId }, data: { status: "RUNNING" } })
      : await prisma.evaluation.create({ data: { traceId: trace.id, status: "RUNNING" } });

  const semantic = semanticSimilarity(trace.prompt, trace.response ?? "");
  const hallucination = hallucinationRisk(trace.prompt, trace.response ?? "");

  await prisma.$transaction([
    prisma.evaluationScore.upsert({
      where: { evaluationId_metric: { evaluationId: evaluation.id, metric: "semantic_similarity" } },
      update: semantic,
      create: { evaluationId: evaluation.id, metric: "semantic_similarity", ...semantic }
    }),
    prisma.evaluationScore.upsert({
      where: { evaluationId_metric: { evaluationId: evaluation.id, metric: "hallucination_risk" } },
      update: hallucination,
      create: { evaluationId: evaluation.id, metric: "hallucination_risk", ...hallucination }
    }),
    prisma.evaluation.update({ where: { id: evaluation.id }, data: { status: "COMPLETED" } })
  ]);
}

const worker = new Worker("evaluations", runEvaluation, { connection, concurrency: 5 });

worker.on("completed", (job) => {
  console.log(`Evaluation job ${job.id} completed`);
});

worker.on("failed", async (job, error) => {
  console.error(`Evaluation job ${job?.id} failed`, error);
  if (job?.data.evaluationId) {
    await prisma.evaluation.update({
      where: { id: job.data.evaluationId },
      data: { status: "FAILED", reason: error.message }
    });
  }
});

process.on("SIGTERM", async () => {
  await worker.close();
  await prisma.$disconnect();
  await connection.quit();
});
