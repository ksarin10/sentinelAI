export type ModelLifecycleStatus = "ACTIVE" | "RETIRING" | "DEPRECATED" | "RETIRED";
export type TaskRiskLevel = "LOW" | "MEDIUM" | "HIGH";
export type OptimizationGoal = "BALANCED" | "REDUCE_COST" | "REDUCE_LATENCY" | "MAXIMIZE_QUALITY";

export type ModelCapability = "text" | "vision" | "tools" | "json" | "reasoning" | "embeddings";

export type ModelCatalogEntry = {
  provider: string;
  model: string;
  displayName: string;
  status: ModelLifecycleStatus;
  replacementProvider?: string;
  replacementModel?: string;
  retirementDate?: string;
  inputTokenPricePer1M: number;
  outputTokenPricePer1M: number;
  contextWindow?: number;
  capabilities: ModelCapability[];
  notes?: string;
  catalogUpdatedAt: string;
};

export type TaskProfileDto = {
  id: string;
  projectId: string;
  taskName: string;
  riskLevel: TaskRiskLevel;
  qualityThreshold: number;
  optimizationGoal: OptimizationGoal;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
};

export const initialModelCatalog: ModelCatalogEntry[] = [
  {
    provider: "openai",
    model: "gpt-4.1",
    displayName: "GPT-4.1",
    status: "ACTIVE",
    inputTokenPricePer1M: 2,
    outputTokenPricePer1M: 8,
    contextWindow: 1047576,
    capabilities: ["text", "vision", "tools", "json", "reasoning"],
    catalogUpdatedAt: "2026-05-23"
  },
  {
    provider: "openai",
    model: "gpt-4.1-mini",
    displayName: "GPT-4.1 mini",
    status: "ACTIVE",
    inputTokenPricePer1M: 0.4,
    outputTokenPricePer1M: 1.6,
    contextWindow: 1047576,
    capabilities: ["text", "vision", "tools", "json"],
    catalogUpdatedAt: "2026-05-23"
  },
  {
    provider: "openai",
    model: "gpt-4.1-nano",
    displayName: "GPT-4.1 nano",
    status: "ACTIVE",
    inputTokenPricePer1M: 0.1,
    outputTokenPricePer1M: 0.4,
    contextWindow: 1047576,
    capabilities: ["text", "json"],
    catalogUpdatedAt: "2026-05-23"
  },
  {
    provider: "anthropic",
    model: "claude-sonnet-4.5",
    displayName: "Claude Sonnet 4.5",
    status: "RETIRING",
    replacementProvider: "anthropic",
    replacementModel: "claude-sonnet-4.6",
    retirementDate: "2026-09-01",
    inputTokenPricePer1M: 3,
    outputTokenPricePer1M: 15,
    contextWindow: 200000,
    capabilities: ["text", "vision", "tools", "json", "reasoning"],
    notes: "Placeholder lifecycle entry for migration workflow demos.",
    catalogUpdatedAt: "2026-05-23"
  },
  {
    provider: "anthropic",
    model: "claude-sonnet-4.6",
    displayName: "Claude Sonnet 4.6",
    status: "ACTIVE",
    inputTokenPricePer1M: 3,
    outputTokenPricePer1M: 15,
    contextWindow: 200000,
    capabilities: ["text", "vision", "tools", "json", "reasoning"],
    catalogUpdatedAt: "2026-05-23"
  }
];
