import { Queue } from "bullmq";
import { PrismaService } from "../prisma/prisma.service";

export type EvaluationJobData = {
  traceId: string;
  evaluationId: string;
};

export const evaluationJobOptions = {
  attempts: 3,
  backoff: { type: "exponential", delay: 5000 }
} as const;

export async function queueTraceEvaluation(prisma: PrismaService, queue: Queue, traceId: string) {
  const evaluation = await prisma.evaluation.create({ data: { traceId, status: "QUEUED" } });
  const job = await queue.add("evaluate-trace", { traceId, evaluationId: evaluation.id } satisfies EvaluationJobData, evaluationJobOptions);

  return { evaluation, job };
}
