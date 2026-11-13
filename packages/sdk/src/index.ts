import type { IngestTraceRequest, IngestTraceResponse, ModelExperimentMetadata, TaskTraceMetadata } from "@sentinelai/shared";

export type SentinelAIClientOptions = {
  apiKey: string;
  baseUrl?: string;
  durableIngestionUrl?: string;
  sourceApp?: string;
  telemetryFailurePolicy?: "best-effort" | "strict";
  onTelemetryError?: (error: unknown, context: { name: string; applicationStatus: "SUCCESS" | "ERROR" }) => void;
};

export type DurableIngestTraceResponse = {
  idempotencyKey: string;
  accepted: true;
  duplicate: boolean;
};

export type SentinelAITraceRequest = IngestTraceRequest & {
  task?: TaskTraceMetadata;
  experiment?: ModelExperimentMetadata;
};

export type SentinelAIObserveOptions = Omit<SentinelAITraceRequest, "name" | "latencyMs" | "prompt"> & {
  prompt?: string;
};

export function normalizeTracePayload(payload: SentinelAITraceRequest): IngestTraceRequest {
  const { task, experiment, metadata, ...trace } = payload;
  const enrichedMetadata = {
    ...metadata,
    ...(task ? { task } : {}),
    ...(experiment ? { experiment } : {})
  };

  return {
    ...trace,
    metadata: Object.keys(enrichedMetadata).length > 0 ? enrichedMetadata : undefined
  };
}

export class SentinelAI {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly durableIngestionUrl?: string;
  private readonly sourceApp?: string;
  private readonly telemetryFailurePolicy: "best-effort" | "strict";
  private readonly onTelemetryError?: SentinelAIClientOptions["onTelemetryError"];

  constructor(options: SentinelAIClientOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl ?? "http://localhost:4000/api";
    this.durableIngestionUrl = options.durableIngestionUrl?.replace(/\/$/, "");
    this.sourceApp = options.sourceApp;
    this.telemetryFailurePolicy = options.telemetryFailurePolicy ?? "best-effort";
    this.onTelemetryError = options.onTelemetryError;
  }

  async trace(payload: SentinelAITraceRequest): Promise<IngestTraceResponse | DurableIngestTraceResponse> {
    const durable = Boolean(this.durableIngestionUrl);
    const idempotencyKey = payload.externalId ?? globalThis.crypto.randomUUID();
    const response = await fetch(durable ? `${this.durableIngestionUrl}/v1/traces` : `${this.baseUrl}/ingest/traces`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-sentinel-api-key": this.apiKey,
        ...(durable ? { "idempotency-key": idempotencyKey } : {}),
        ...(durable && this.sourceApp ? { "x-sentinel-source": this.sourceApp } : {})
      },
      body: JSON.stringify(normalizeTracePayload(payload))
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(`SentinelAI ingestion failed: ${response.status} ${message}`);
    }

    return response.json() as Promise<IngestTraceResponse | DurableIngestTraceResponse>;
  }

  async observe<T>(name: string, run: () => Promise<T>, options?: SentinelAIObserveOptions) {
    const started = Date.now();
    let result: T;
    try {
      result = await run();
    } catch (applicationError) {
      try {
        await this.trace({
          name,
          prompt: options?.prompt ?? name,
          response: applicationError instanceof Error ? applicationError.message : "Unknown error",
          latencyMs: Date.now() - started,
          startedAt: new Date(started).toISOString(),
          endedAt: new Date().toISOString(),
          status: "ERROR",
          provider: options?.provider ?? "custom",
          model: options?.model ?? "unknown",
          metadata: options?.metadata,
          task: options?.task,
          experiment: options?.experiment
        });
      } catch (telemetryError) {
        this.reportTelemetryError(telemetryError, name, "ERROR");
      }
      throw applicationError;
    }

    try {
      await this.trace({
        name,
        prompt: options?.prompt ?? name,
        response: typeof result === "string" ? result : JSON.stringify(result),
        latencyMs: Date.now() - started,
        startedAt: new Date(started).toISOString(),
        endedAt: new Date().toISOString(),
        status: "SUCCESS",
        provider: options?.provider ?? "custom",
        model: options?.model ?? "unknown",
        tokens: options?.tokens,
        costUsd: options?.costUsd,
        metadata: options?.metadata,
        task: options?.task,
        experiment: options?.experiment
      });
    } catch (telemetryError) {
      this.reportTelemetryError(telemetryError, name, "SUCCESS");
      if (this.telemetryFailurePolicy === "strict") {
        throw telemetryError;
      }
    }
    return result;
  }

  private reportTelemetryError(error: unknown, name: string, applicationStatus: "SUCCESS" | "ERROR") {
    try {
      this.onTelemetryError?.(error, { name, applicationStatus });
    } catch {
      // Error reporting must never replace the application result or error.
    }
  }
}
