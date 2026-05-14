import type { IngestTraceRequest, IngestTraceResponse } from "@sentinelai/shared";

export type SentinelAIClientOptions = {
  apiKey: string;
  baseUrl?: string;
};

export class SentinelAI {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(options: SentinelAIClientOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl ?? "http://localhost:4000/api";
  }

  async trace(payload: IngestTraceRequest): Promise<IngestTraceResponse> {
    const response = await fetch(`${this.baseUrl}/ingest/traces`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-sentinel-api-key": this.apiKey
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(`SentinelAI ingestion failed: ${response.status} ${message}`);
    }

    return response.json() as Promise<IngestTraceResponse>;
  }

  async observe<T>(name: string, run: () => Promise<T>, metadata?: Omit<IngestTraceRequest, "name" | "latencyMs" | "prompt"> & { prompt?: string }) {
    const started = Date.now();
    try {
      const result = await run();
      await this.trace({
        name,
        prompt: metadata?.prompt ?? name,
        response: typeof result === "string" ? result : JSON.stringify(result),
        latencyMs: Date.now() - started,
        startedAt: new Date(started).toISOString(),
        endedAt: new Date().toISOString(),
        status: "SUCCESS",
        provider: metadata?.provider ?? "custom",
        model: metadata?.model ?? "unknown",
        tokens: metadata?.tokens,
        costUsd: metadata?.costUsd,
        metadata: metadata?.metadata
      });
      return result;
    } catch (error) {
      await this.trace({
        name,
        prompt: metadata?.prompt ?? name,
        response: error instanceof Error ? error.message : "Unknown error",
        latencyMs: Date.now() - started,
        startedAt: new Date(started).toISOString(),
        endedAt: new Date().toISOString(),
        status: "ERROR",
        provider: metadata?.provider ?? "custom",
        model: metadata?.model ?? "unknown",
        metadata: metadata?.metadata
      });
      throw error;
    }
  }
}
