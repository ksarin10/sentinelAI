import assert from "node:assert/strict";
import { dispatchEvaluationOutbox } from "../src/evaluation-dispatcher";

async function main() {
  const updates: any[] = [];
  const prisma = {
    evaluationDispatch: {
      findMany: async () => [
        {
          id: "dispatch_1",
          evaluationId: "eval_1",
          attempts: 0,
          evaluation: { traceId: "trace_1", status: "QUEUED" }
        }
      ],
      updateMany: async (input: any) => {
        updates.push(input);
        return { count: 1 };
      }
    }
  } as any;
  const jobs: any[] = [];
  const queue = {
    add: async (...args: any[]) => {
      jobs.push(args);
      return {};
    }
  } as any;
  const now = new Date("2026-11-12T23:00:00.000Z");

  assert.deepEqual(await dispatchEvaluationOutbox(prisma, queue, now), {
    scanned: 1,
    dispatched: 1,
    failed: 0
  });
  assert.equal(jobs[0][2].jobId, "evaluation-eval_1");
  assert.equal(updates[0].data.status, "DISPATCHED");

  updates.length = 0;
  const failed = await dispatchEvaluationOutbox(prisma, { add: async () => Promise.reject(new Error("redis down")) } as any, now);
  assert.deepEqual(failed, { scanned: 1, dispatched: 0, failed: 1 });
  assert.equal(updates[0].data.attempts.increment, 1);
  assert.equal(updates[0].data.availableAt.toISOString(), "2026-11-12T23:00:01.000Z");
}

void main();
