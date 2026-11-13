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

  let capturedURL = "";
  let capturedHeaders = new Headers();
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    capturedURL = String(url);
    capturedHeaders = new Headers(init?.headers);
    return new Response(JSON.stringify({ idempotencyKey: "checkout-42", accepted: true, duplicate: false }), { status: 202 });
  }) as typeof fetch;

  try {
    const durableClient = new SentinelAI({
      apiKey: "sai_test",
      durableIngestionUrl: "http://localhost:4100/",
      sourceApp: "checkout-api"
    });
    await durableClient.trace({
      externalId: "checkout-42",
      name: "checkout.answer",
      provider: "openai",
      model: "gpt-4.1-mini",
      prompt: "Where is my order?",
      latencyMs: 85
    });
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(capturedURL, "http://localhost:4100/v1/traces");
  assert.equal(capturedHeaders.get("idempotency-key"), "checkout-42");
  assert.equal(capturedHeaders.get("x-sentinel-source"), "checkout-api");
}

void main();
