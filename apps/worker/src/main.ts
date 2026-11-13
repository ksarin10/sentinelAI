import { PrismaClient } from "@prisma/client";
import { Job, Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import { assertEvaluationJobData, EvaluationJobData } from "./evaluation-job";
import { runEvaluationJob } from "./run-evaluation";
import { runShadowExperiment } from "./run-shadow-experiment";
import { dispatchEvaluationOutbox } from "./evaluation-dispatcher";

const prisma = new PrismaClient();
const connection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", { maxRetriesPerRequest: null });
const evaluationQueue = new Queue("evaluations", { connection });

let dispatchRunning = false;
async function dispatchPendingEvaluations() {
  if (dispatchRunning) return;
  dispatchRunning = true;
  try {
    const summary = await dispatchEvaluationOutbox(prisma, evaluationQueue);
    if (summary.dispatched > 0 || summary.failed > 0) {
      console.log("Evaluation outbox dispatch", summary);
    }
  } finally {
    dispatchRunning = false;
  }
}

const dispatchTimer = setInterval(() => void dispatchPendingEvaluations(), 1000);
void dispatchPendingEvaluations();

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
  clearInterval(dispatchTimer);
  await evaluationWorker.close();
  await shadowWorker.close();
  await evaluationQueue.close();
  await prisma.$disconnect();
  await connection.quit();
});
