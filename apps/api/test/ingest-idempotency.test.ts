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

let createCalls = 0;
const traces = {
  findByExternalId: async () => ({
    id: "trace-existing",
    evaluations: [{ id: "evaluation-existing" }]
  }),
  create: async () => {
    createCalls += 1;
    throw new Error("create should not run for a duplicate");
  }
};

async function main() {
  const service = new IngestService({} as any, traces as any, {} as any);
  const result = await service.ingest(project, dto);

  assert.deepEqual(result, {
    traceId: "trace-existing",
    evaluationId: "evaluation-existing",
    queued: false,
    duplicate: true
  });
  assert.equal(createCalls, 0);
}

void main();
