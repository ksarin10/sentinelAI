export type ModelLifecycleStatus = "ACTIVE" | "RETIRING" | "DEPRECATED" | "RETIRED";
export type TaskRiskLevel = "LOW" | "MEDIUM" | "HIGH";
export type OptimizationGoal = "BALANCED" | "REDUCE_COST" | "REDUCE_LATENCY" | "MAXIMIZE_QUALITY";

export type ModelCapability = "text" | "vision" | "tools" | "json" | "reasoning" | "embeddings";

export type ModelCatalogSource = "MANUAL" | "PROVIDER_DOCS" | "PROVIDER_API";

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
  source?: ModelCatalogSource;
  sourceUrl?: string;
  confidence?: number;
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

export { catalogProviders, CATALOG_VERSION, initialModelCatalog, modelCatalog } from "./catalog";
