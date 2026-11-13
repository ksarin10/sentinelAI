import { Queue } from "bullmq";
import { evaluationJobId, evaluationJobOptions, type EvaluationJobData } from "@sentinelai/shared";
import { PrismaService } from "../prisma/prisma.service";

export { evaluationJobId, evaluationJobOptions } from "@sentinelai/shared";

export async function dispatchEvaluation(prisma: PrismaService, queue: Queue, evaluationId: string) {
  const dispatch = await prisma.evaluationDispatch.findUnique({
    where: { evaluationId },
    include: { evaluation: true }
  });
  if (!dispatch || dispatch.status === "DISPATCHED" || dispatch.evaluation.status !== "QUEUED") {
    return false;
  }

  await queue.add(
    "evaluate-trace",
    { traceId: dispatch.evaluation.traceId, evaluationId } satisfies EvaluationJobData,
    { ...evaluationJobOptions, jobId: evaluationJobId(evaluationId) }
  );
  await prisma.evaluationDispatch.updateMany({
    where: { evaluationId, status: "PENDING" },
    data: { status: "DISPATCHED", dispatchedAt: new Date(), lastError: null }
  });
  return true;
}

export async function tryDispatchEvaluation(prisma: PrismaService, queue: Queue, evaluationId: string) {
  try {
    return await dispatchEvaluation(prisma, queue, evaluationId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown queue error";
    const dispatch = await prisma.evaluationDispatch.findUnique({ where: { evaluationId }, select: { attempts: true } });
    const attempts = (dispatch?.attempts ?? 0) + 1;
    const delayMs = Math.min(60_000, 1000 * 2 ** Math.min(attempts - 1, 6));
    await prisma.evaluationDispatch.updateMany({
      where: { evaluationId, status: "PENDING" },
      data: {
        attempts: { increment: 1 },
        lastError: message.slice(0, 1000),
        availableAt: new Date(Date.now() + delayMs)
      }
    });
    return false;
  }
}

export async function scheduleTraceEvaluation(prisma: PrismaService, queue: Queue, traceId: string) {
  const evaluation = await prisma.$transaction((transaction) =>
    transaction.evaluation.create({
      data: { traceId, status: "QUEUED", dispatch: { create: {} } }
    })
  );
  const dispatched = await tryDispatchEvaluation(prisma, queue, evaluation.id);
  return { evaluation, dispatched };
}
