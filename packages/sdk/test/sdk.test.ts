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
  experiment: {
    experimentId: "exp_1",
    variant: "candidate",
    candidateModel: "gpt-4.1-mini",
  },
});

assert.equal("task" in normalized, false);
assert.equal("experiment" in normalized, false);
assert.deepEqual(normalized.metadata, {
  environment: "test",
  task: { version: "v1", riskLevel: "MEDIUM" },
  experiment: {
    experimentId: "exp_1",
    variant: "candidate",
    candidateModel: "gpt-4.1-mini",
  },
});

async function main() {
  let capturedBody: unknown;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (
    _url: string | URL | Request,
    init?: RequestInit,
  ) => {
    capturedBody = JSON.parse(String(init?.body));
    return new Response(
      JSON.stringify({
        traceId: "trace_1",
        evaluationId: "eval_1",
        queued: true,
      }),
      { status: 200 },
    );
  }) as typeof fetch;

  try {
    const client = new SentinelAI({
      apiKey: "sai_test",
      baseUrl: "http://localhost:4000/api",
    });
    await client.trace({
      externalId: "sdk-trace-1",
      name: "support.answer",
      provider: "openai",
      model: "gpt-4.1",
      prompt: "Help this customer",
      latencyMs: 120,
      task: { inputClass: "support_ticket" },
      experiment: { variant: "baseline" },
    });
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.deepEqual(capturedBody, {
    externalId: "sdk-trace-1",
    name: "support.answer",
    provider: "openai",
    model: "gpt-4.1",
    prompt: "Help this customer",
    latencyMs: 120,
    metadata: {
      task: { inputClass: "support_ticket" },
      experiment: { variant: "baseline" },
    },
  });

  let capturedURL = "";
  let capturedHeaders = new Headers();
  globalThis.fetch = (async (
    url: string | URL | Request,
    init?: RequestInit,
  ) => {
    capturedURL = String(url);
    capturedHeaders = new Headers(init?.headers);
    return new Response(
      JSON.stringify({
        idempotencyKey: "checkout-42",
        accepted: true,
        duplicate: false,
      }),
      { status: 202 },
    );
  }) as typeof fetch;

  try {
    const durableClient = new SentinelAI({
      apiKey: "sai_test",
      durableIngestionUrl: "http://localhost:4100/",
      sourceApp: "checkout-api",
    });
    await durableClient.trace({
      externalId: "checkout-42",
      name: "checkout.answer",
      provider: "openai",
      model: "gpt-4.1-mini",
      prompt: "Where is my order?",
      latencyMs: 85,
    });
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(capturedURL, "http://localhost:4100/v1/traces");
  assert.equal(capturedHeaders.get("idempotency-key"), "checkout-42");
  assert.equal(capturedHeaders.get("x-sentinel-source"), "checkout-api");

  const telemetryErrors: Array<{ error: unknown; status: string }> = [];
  globalThis.fetch = (async () =>
    new Response("unavailable", { status: 503 })) as typeof fetch;
  try {
    const bestEffort = new SentinelAI({
      apiKey: "sai_test",
      onTelemetryError: (error, context) =>
        telemetryErrors.push({ error, status: context.applicationStatus }),
    });
    assert.equal(
      await bestEffort.observe(
        "successful.operation",
        async () => "application result",
      ),
      "application result",
    );
    assert.equal(telemetryErrors.length, 1);
    assert.equal(telemetryErrors[0].status, "SUCCESS");

    const strict = new SentinelAI({
      apiKey: "sai_test",
      telemetryFailurePolicy: "strict",
    });
    await assert.rejects(
      () =>
        strict.observe("strict.operation", async () => "application result"),
      /ingestion failed: 503/,
    );

    const applicationError = new Error("application failed");
    let observedError: unknown;
    try {
      await strict.observe("failed.operation", async () => {
        throw applicationError;
      });
    } catch (error) {
      observedError = error;
    }
    assert.equal(
      observedError,
      applicationError,
      "telemetry failure must not mask the original application error",
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
}

void main();
