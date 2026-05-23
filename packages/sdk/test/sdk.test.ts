import assert from "node:assert/strict";
import { normalizeTracePayload, SentinelAI } from "../src";

const normalized = normalizeTracePayload({
  name: "support.answer",
  provider: "openai",
  model: "gpt-4.1",
  prompt: "Help this customer",
  latencyMs: 120,
  metadata: { environment: "test" },
  task: { version: "v1", riskLevel: "MEDIUM" },
  experiment: { experimentId: "exp_1", variant: "candidate", candidateModel: "gpt-4.1-mini" }
});

assert.equal("task" in normalized, false);
assert.equal("experiment" in normalized, false);
assert.deepEqual(normalized.metadata, {
  environment: "test",
  task: { version: "v1", riskLevel: "MEDIUM" },
  experiment: { experimentId: "exp_1", variant: "candidate", candidateModel: "gpt-4.1-mini" }
});

async function main() {
  let capturedBody: unknown;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
    capturedBody = JSON.parse(String(init?.body));
    return new Response(JSON.stringify({ traceId: "trace_1", evaluationId: "eval_1", queued: true }), { status: 200 });
  }) as typeof fetch;

  try {
    const client = new SentinelAI({ apiKey: "sai_test", baseUrl: "http://localhost:4000/api" });
    await client.trace({
      name: "support.answer",
      provider: "openai",
      model: "gpt-4.1",
      prompt: "Help this customer",
      latencyMs: 120,
      task: { inputClass: "support_ticket" },
      experiment: { variant: "baseline" }
    });
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.deepEqual(capturedBody, {
    name: "support.answer",
    provider: "openai",
    model: "gpt-4.1",
    prompt: "Help this customer",
    latencyMs: 120,
    metadata: {
      task: { inputClass: "support_ticket" },
      experiment: { variant: "baseline" }
    }
  });
}

void main();
