import { TaskModelAnalyticsPoint } from "../analytics/task-model-analytics";
import { ModelCatalogDto } from "../model-catalog/model-catalog.dto";

export type ModelMigrationReadiness = "READY_TO_TEST" | "NEEDS_REPLACEMENT" | "URGENT" | "BLOCKED";

export type ModelMigrationReport = {
  provider: string;
  model: string;
  displayName: string;
  status: string;
  replacementProvider: string | null;
  replacementModel: string | null;
  retirementDate: string | null;
  daysUntilRetirement: number | null;
  readiness: ModelMigrationReadiness;
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

function daysUntil(date: string | null, now: Date) {
  if (!date) {
    return null;
  }
  const milliseconds = new Date(date).getTime() - now.getTime();
  return Math.ceil(milliseconds / (1000 * 60 * 60 * 24));
}

function readinessFor(model: ModelCatalogDto, daysUntilRetirement: number | null): ModelMigrationReadiness {
  if (!model.replacementProvider || !model.replacementModel) {
    return "BLOCKED";
  }
  if (model.status === "RETIRED" || model.status === "DEPRECATED") {
    return "URGENT";
  }
  if (daysUntilRetirement !== null && daysUntilRetirement <= 30) {
    return "URGENT";
  }
  if (daysUntilRetirement !== null && daysUntilRetirement <= 90) {
    return "NEEDS_REPLACEMENT";
  }
  return "READY_TO_TEST";
}

function rationaleFor(model: ModelCatalogDto, readiness: ModelMigrationReadiness, daysUntilRetirement: number | null) {
  const rationale = [`${model.displayName} is marked ${model.status} in the model catalog.`];

  if (model.replacementProvider && model.replacementModel) {
    rationale.push(`Catalog replacement is ${model.replacementProvider}/${model.replacementModel}.`);
  } else {
    rationale.push("No replacement model is recorded yet, so this migration is blocked on catalog research.");
  }

  if (daysUntilRetirement !== null) {
    rationale.push(`Retirement is ${daysUntilRetirement} day(s) away.`);
  }

  if (readiness === "READY_TO_TEST") {
    rationale.push("Start shadow testing the replacement before moving production traffic.");
  } else if (readiness === "NEEDS_REPLACEMENT") {
    rationale.push("Prioritize a replacement experiment because the retirement window is getting close.");
  } else if (readiness === "URGENT") {
    rationale.push("Treat this as urgent because the model is deprecated, retired, or close to retirement.");
  }

  return rationale;
}

export function buildModelMigrationReports(analytics: TaskModelAnalyticsPoint[], catalog: ModelCatalogDto[], now = new Date()) {
  const riskyModels = catalog.filter((model) => model.status !== "ACTIVE");

  return riskyModels
    .map((model): ModelMigrationReport | null => {
      const affectedTasks = analytics.filter((point) => point.provider === model.provider && point.model === model.model);
      if (affectedTasks.length === 0) {
        return null;
      }

      const days = daysUntil(model.retirementDate, now);
      const readiness = readinessFor(model, days);

      return {
        provider: model.provider,
        model: model.model,
        displayName: model.displayName,
        status: model.status,
        replacementProvider: model.replacementProvider,
        replacementModel: model.replacementModel,
        retirementDate: model.retirementDate,
        daysUntilRetirement: days,
        readiness,
        totalTraceCount: affectedTasks.reduce((sum, task) => sum + task.traceCount, 0),
        totalCostUsd: Number(affectedTasks.reduce((sum, task) => sum + task.totalCostUsd, 0).toFixed(6)),
        affectedTasks: affectedTasks.map((task) => ({
          taskName: task.taskName,
          traceCount: task.traceCount,
          averageLatencyMs: task.averageLatencyMs,
          errorRate: task.errorRate,
          averageSemanticSimilarity: task.averageSemanticSimilarity,
          averageHallucinationRisk: task.averageHallucinationRisk
        })),
        rationale: rationaleFor(model, readiness, days)
      };
    })
    .filter((report): report is ModelMigrationReport => report !== null)
    .sort((a, b) => {
      const readinessOrder: Record<ModelMigrationReadiness, number> = {
        URGENT: 0,
        BLOCKED: 1,
        NEEDS_REPLACEMENT: 2,
        READY_TO_TEST: 3
      };
      return readinessOrder[a.readiness] - readinessOrder[b.readiness] || b.totalTraceCount - a.totalTraceCount;
    });
}
