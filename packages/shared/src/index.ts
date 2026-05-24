export type TraceStatus = "SUCCESS" | "ERROR" | "TIMEOUT";
export type EvaluationStatus = "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED";

export type TokenUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

export type TaskTraceMetadata = {
  version?: string;
  inputClass?: string;
  outputClass?: string;
  riskLevel?: "LOW" | "MEDIUM" | "HIGH";
};

export type ModelExperimentMetadata = {
  experimentId?: string;
  experimentName?: string;
  variant?: string;
  baselineProvider?: string;
  baselineModel?: string;
  candidateProvider?: string;
  candidateModel?: string;
};

export type TraceMetadata = {
  temperature?: number;
  topP?: number;
  userId?: string;
  sessionId?: string;
  tags?: string[];
  environment?: "development" | "staging" | "production" | string;
  task?: TaskTraceMetadata;
  experiment?: ModelExperimentMetadata;
  [key: string]: unknown;
};

export type IngestTraceRequest = {
  externalId?: string;
  name: string;
  provider: string;
  model: string;
  prompt: string;
  response?: string;
  status?: TraceStatus;
  latencyMs: number;
  tokens?: Partial<TokenUsage>;
  costUsd?: number;
  metadata?: TraceMetadata;
  startedAt?: string;
  endedAt?: string;
};

export type IngestTraceResponse = {
  traceId: string;
  evaluationId?: string;
  queued: boolean;
};

export type AnalyticsSummary = {
  traceCount: number;
  averageLatencyMs: number;
  totalTokens: number;
  totalCostUsd: number;
  errorRate: number;
};

export type AnalyticsPoint = {
  date: string;
  traces: number;
  latencyMs: number;
  tokens: number;
  costUsd: number;
};

export type TaskModelAnalyticsPoint = {
  taskName: string;
  provider: string;
  model: string;
  traceCount: number;
  averageLatencyMs: number;
  totalTokens: number;
  totalCostUsd: number;
  averageCostUsd: number;
  errorRate: number;
  averageSemanticSimilarity: number | null;
  averageHallucinationRisk: number | null;
};

export type EvaluationScoreDto = {
  metric: "semantic_similarity" | "hallucination_risk" | string;
  score: number;
  details?: Record<string, unknown>;
};

export * from "./model-catalog";
export * from "./catalog";
export * from "./shadow-experiment";
