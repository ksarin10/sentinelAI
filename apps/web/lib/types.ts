import type { AnalyticsPoint, AnalyticsSummary, EvaluationStatus, TraceStatus } from "@sentinelai/shared";

export type AuthResponse = {
  accessToken: string;
  user: {
    id: string;
    email: string;
  };
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

export type DashboardData = {
  project: ProjectRecord;
  summary: AnalyticsSummary;
  timeseries: AnalyticsPoint[];
  traces: TraceRecord[];
};
