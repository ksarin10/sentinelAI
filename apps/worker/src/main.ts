import { PrismaClient } from "@prisma/client";
import { Job, Worker } from "bullmq";
import IORedis from "ioredis";
import { assertEvaluationJobData, EvaluationJobData } from "./evaluation-job";
import { runEvaluationJob } from "./run-evaluation";
import { runShadowExperiment } from "./run-shadow-experiment";

const prisma = new PrismaClient();
const connection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", { maxRetriesPerRequest: null });

async function runEvaluation(job: Job<EvaluationJobData>) {
  const data = assertEvaluationJobData(job.data);
  await runEvaluationJob(prisma, data);
}

const evaluationWorker = new Worker("evaluations", runEvaluation, { connection, concurrency: 5 });

evaluationWorker.on("completed", (job) => {
  console.log(`Evaluation job ${job.id} completed`);
});

evaluationWorker.on("failed", async (job, error) => {
  console.error(`Evaluation job ${job?.id} failed`, error);
  if (job?.data?.evaluationId) {
    await prisma.evaluation.update({
      where: { id: job.data.evaluationId },
      data: { status: "FAILED", reason: error.message }
    });
  }
});

const shadowWorker = new Worker(
  "shadow-experiments",
  async (job: Job<{ experimentId: string }>) => {
    await runShadowExperiment(prisma, job.data.experimentId);
  },
  { connection, concurrency: 2 }
);

shadowWorker.on("completed", (job) => {
  console.log(`Shadow experiment job ${job.id} completed`);
});

shadowWorker.on("failed", (job, error) => {
  console.error(`Shadow experiment job ${job?.id} failed`, error);
});

process.on("SIGTERM", async () => {
  await evaluationWorker.close();
  await shadowWorker.close();
  await prisma.$disconnect();
  await connection.quit();
});
