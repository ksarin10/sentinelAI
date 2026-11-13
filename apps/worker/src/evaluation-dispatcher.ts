import { PrismaClient } from "@prisma/client";
import { Queue } from "bullmq";
import { evaluationJobId, evaluationJobOptions } from "@sentinelai/shared";

export type DispatchSummary = {
  scanned: number;
  dispatched: number;
  failed: number;
};

export async function dispatchEvaluationOutbox(
  prisma: PrismaClient,
  queue: Queue,
  now = new Date()
): Promise<DispatchSummary> {
  const pending = await prisma.evaluationDispatch.findMany({
    where: { status: "PENDING", availableAt: { lte: now } },
    include: { evaluation: true },
    orderBy: { createdAt: "asc" },
    take: 100
  });
  const summary: DispatchSummary = { scanned: pending.length, dispatched: 0, failed: 0 };

  for (const dispatch of pending) {
    if (dispatch.evaluation.status !== "QUEUED") {
      await prisma.evaluationDispatch.updateMany({
        where: { id: dispatch.id, status: "PENDING" },
        data: { status: "DISPATCHED", dispatchedAt: now, lastError: null }
      });
      continue;
    }

    try {
      await queue.add(
        "evaluate-trace",
        { traceId: dispatch.evaluation.traceId, evaluationId: dispatch.evaluationId },
        { ...evaluationJobOptions, jobId: evaluationJobId(dispatch.evaluationId) }
      );
      await prisma.evaluationDispatch.updateMany({
        where: { id: dispatch.id, status: "PENDING" },
        data: { status: "DISPATCHED", dispatchedAt: now, lastError: null }
      });
      summary.dispatched += 1;
    } catch (error) {
      const attempts = dispatch.attempts + 1;
      const delayMs = Math.min(60_000, 1000 * 2 ** Math.min(attempts - 1, 6));
      const message = error instanceof Error ? error.message : "Unknown queue error";
      await prisma.evaluationDispatch.updateMany({
        where: { id: dispatch.id, status: "PENDING" },
        data: {
          attempts: { increment: 1 },
          lastError: message.slice(0, 1000),
          availableAt: new Date(now.getTime() + delayMs)
        }
      });
      summary.failed += 1;
    }
  }

  return summary;
}
