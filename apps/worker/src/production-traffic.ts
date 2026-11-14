import {
  aggregateReplayRuns,
  classifyReplayRun,
  evaluateShadowExperimentCompletion,
} from "@sentinelai/shared";

export type ProductionEvaluation = {
  semantic: number;
  hallucination: number;
};

export function summarizeProductionTraffic(
  evaluations: ProductionEvaluation[],
  qualityThreshold: number,
) {
  if (evaluations.length === 0) {
    throw new Error(
      "Production traffic summary requires at least one evaluation",
    );
  }
  const classified = evaluations.map((evaluation) => ({
    evaluation,
    explanation: classifyReplayRun({
      semanticScore: evaluation.semantic,
      hallucinationScore: evaluation.hallucination,
      qualityThreshold,
      riskLevel: "MEDIUM",
    }),
  }));
  const aggregate = aggregateReplayRuns(classified);
  const averageSemantic =
    evaluations.reduce((sum, evaluation) => sum + evaluation.semantic, 0) /
    evaluations.length;
  const averageHallucination =
    evaluations.reduce((sum, evaluation) => sum + evaluation.hallucination, 0) /
    evaluations.length;
  const completion = evaluateShadowExperimentCompletion(
    aggregate.passedRuns,
    aggregate.borderlineRuns,
    aggregate.failedRuns,
    aggregate.criticalFailures,
    evaluations.length,
  );

  return {
    ...aggregate,
    averageSemantic,
    averageHallucination,
    completion,
  };
}
