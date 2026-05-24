import type { AnalyticsPoint, AnalyticsSummary, EvaluationStatus, TraceStatus } from "@sentinelai/shared";

export type AuthResponse = {
  accessToken: string;
  user: {
    id: string;
    email: string;
  };
};

export type TaskProfileRecord = {
  id: string;
  projectId: string;
  taskName: string;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  qualityThreshold: number;
  optimizationGoal: "BALANCED" | "REDUCE_COST" | "REDUCE_LATENCY" | "MAXIMIZE_QUALITY";
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProviderCredentialRecord = {
  provider: string;
  keyHint: string;
  createdAt: string;
  updatedAt: string;
};

export type ApiKeyRecord = {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt?: string | null;
  createdAt: string;
  secret?: string;
};

export type ProjectRecord = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  createdAt: string;
  apiKeys?: ApiKeyRecord[];
};

export type EvaluationScoreRecord = {
  id: string;
  metric: string;
  score: number;
  details?: Record<string, unknown>;
  createdAt: string;
};

export type EvaluationRecord = {
  id: string;
  status: EvaluationStatus;
  reason?: string | null;
  scores: EvaluationScoreRecord[];
  createdAt: string;
  updatedAt: string;
};

export type TraceRecord = {
  id: string;
  externalId?: string | null;
  projectId: string;
  name: string;
  provider: string;
  model: string;
  prompt: string;
  response?: string | null;
  status: TraceStatus;
  latencyMs: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd: string | number;
  metadata?: Record<string, unknown> | null;
  startedAt: string;
  endedAt?: string | null;
  createdAt: string;
  evaluations?: EvaluationRecord[];
};

export type ModelRecommendationRecord = {
  taskName: string;
  currentProvider: string;
  currentModel: string;
  recommendedProvider: string;
  recommendedModel: string;
  recommendationType: "REDUCE_COST" | string;
  confidence: "LOW" | "MEDIUM" | "HIGH";
  estimatedSavingsUsd: number;
  estimatedSavingsPercent: number;
  rationale: string[];
  signals: {
    traceCount: number;
    currentAverageCostUsd: number;
    currentAverageLatencyMs: number;
    currentErrorRate: number;
    averageSemanticSimilarity: number | null;
    averageHallucinationRisk: number | null;
    qualityThreshold: number;
    riskLevel: "LOW" | "MEDIUM" | "HIGH";
    optimizationGoal: string;
  };
};

export type ModelCatalogRecord = {
  id: string;
  provider: string;
  model: string;
  displayName: string;
  status: string;
  replacementProvider: string | null;
  replacementModel: string | null;
  retirementDate: string | null;
  inputTokenPricePer1M: number;
  outputTokenPricePer1M: number;
  contextWindow: number | null;
  capabilities: string[];
  notes: string | null;
  source: string;
  sourceUrl: string | null;
  confidence: number;
  lastCheckedAt: string;
  catalogUpdatedAt: string;
};

export type ModelMigrationRecord = {
  provider: string;
  model: string;
  displayName: string;
  status: string;
  replacementProvider: string | null;
  replacementModel: string | null;
  retirementDate: string | null;
  daysUntilRetirement: number | null;
  readiness: "READY_TO_TEST" | "NEEDS_REPLACEMENT" | "URGENT" | "BLOCKED";
  totalTraceCount: number;
  totalCostUsd: number;
  affectedTasks: Array<{
    taskName: string;
    traceCount: number;
    averageLatencyMs: number;
    errorRate: number;
    averageSemanticSimilarity: number | null;
    averageHallucinationRisk: number | null;
  }>;
  rationale: string[];
};

export type DashboardData = {
  project: ProjectRecord;
  summary: AnalyticsSummary;
  timeseries: AnalyticsPoint[];
  traces: TraceRecord[];
  recommendations: ModelRecommendationRecord[];
  modelMigrations: ModelMigrationRecord[];
};
