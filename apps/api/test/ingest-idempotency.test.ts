import assert from "node:assert/strict";
import { IngestService } from "../src/ingest/ingest.service";

const project = { id: "project-1" } as any;
const dto = {
  externalId: "checkout-42",
  name: "checkout.answer",
  provider: "openai",
  model: "gpt-4.1-mini",
  prompt: "Where is my order?",
  latencyMs: 125
};

const traces = {
  findByExternalId: async () => ({
    id: "trace-existing",
    evaluations: [{ id: "evaluation-existing" }]
  })
};

async function main() {
  let repairedOutbox = false;
  const transaction = {
    evaluation: {
      findFirst: async () => ({ id: "evaluation-existing", traceId: "trace-existing", status: "QUEUED", dispatch: null }),
      create: async () => {
        throw new Error("evaluation already exists");
      }
    },
    evaluationDispatch: {
      create: async () => {
        repairedOutbox = true;
        return {};
      }
    }
  };
  const prisma = {
    $transaction: async (callback: (client: typeof transaction) => unknown) => callback(transaction),
    evaluationDispatch: {
      findUnique: async () => ({
        status: "PENDING",
        evaluation: { id: "evaluation-existing", traceId: "trace-existing", status: "QUEUED" }
      }),
      updateMany: async () => ({ count: 1 })
    }
  };
  let queuedJobs = 0;
  const queue = {
    add: async () => {
      queuedJobs += 1;
      return {};
    }
  };
  const service = new IngestService(prisma as any, traces as any, queue as any);
  const result = await service.ingest(project, dto);

  assert.deepEqual(result, {
    traceId: "trace-existing",
    evaluationId: "evaluation-existing",
    queued: true,
    dispatched: true,
    duplicate: true
  });
  assert.equal(repairedOutbox, true);
  assert.equal(queuedJobs, 1);
}

void main();
