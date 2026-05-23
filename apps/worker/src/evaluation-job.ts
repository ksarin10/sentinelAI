export type EvaluationJobData = {
  traceId: string;
  evaluationId: string;
};

export function assertEvaluationJobData(data: Partial<EvaluationJobData>): EvaluationJobData {
  if (!data.traceId) {
    throw new Error("Evaluation job is missing traceId");
  }
  if (!data.evaluationId) {
    throw new Error(`Evaluation job for trace ${data.traceId} is missing evaluationId`);
  }

  return { traceId: data.traceId, evaluationId: data.evaluationId };
}
