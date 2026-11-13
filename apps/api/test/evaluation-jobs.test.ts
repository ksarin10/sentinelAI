import assert from "node:assert/strict";
import { dispatchEvaluation, evaluationJobId, evaluationJobOptions, tryDispatchEvaluation } from "../src/evaluations/evaluation-jobs";

assert.equal(evaluationJobOptions.attempts, 3);
assert.deepEqual(evaluationJobOptions.backoff, { type: "exponential", delay: 5000 });
assert.equal(evaluationJobId("eval_1"), "evaluation-eval_1");

async function main() {
  const updates: unknown[] = [];
  const prisma = {
    evaluationDispatch: {
      findUnique: async () => ({
        status: "PENDING",
        attempts: 0,
        evaluation: { id: "eval_1", traceId: "trace_1", status: "QUEUED" }
      }),
      updateMany: async (input: unknown) => {
        updates.push(input);
        return { count: 1 };
      }
    }
  } as any;
  const queued: unknown[] = [];
  const queue = {
    add: async (...args: unknown[]) => {
      queued.push(args);
      return {};
    }
  } as any;

  assert.equal(await dispatchEvaluation(prisma, queue, "eval_1"), true);
  assert.equal(queued.length, 1);
  assert.deepEqual((queued[0] as unknown[])[2], { ...evaluationJobOptions, jobId: "evaluation-eval_1" });
  assert.equal(updates.length, 1);

  const failingQueue = { add: async () => Promise.reject(new Error("redis unavailable")) } as any;
  assert.equal(await tryDispatchEvaluation(prisma, failingQueue, "eval_1"), false);
  assert.equal(updates.length, 2);
}

void main();
