import type { IngestTraceRequest, IngestTraceResponse, ModelExperimentMetadata, TaskTraceMetadata } from "@sentinelai/shared";

export type SentinelAIClientOptions = {
  apiKey: string;
  baseUrl?: string;
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

  constructor(options: SentinelAIClientOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl ?? "http://localhost:4000/api";
  }

  async trace(payload: SentinelAITraceRequest): Promise<IngestTraceResponse> {
    const response = await fetch(`${this.baseUrl}/ingest/traces`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-sentinel-api-key": this.apiKey
      },
      body: JSON.stringify(normalizeTracePayload(payload))
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(`SentinelAI ingestion failed: ${response.status} ${message}`);
    }

    return response.json() as Promise<IngestTraceResponse>;
  }

  async observe<T>(name: string, run: () => Promise<T>, options?: SentinelAIObserveOptions) {
    const started = Date.now();
    try {
      const result = await run();
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
      return result;
    } catch (error) {
      await this.trace({
        name,
        prompt: options?.prompt ?? name,
        response: error instanceof Error ? error.message : "Unknown error",
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
      throw error;
    }
  }
}
