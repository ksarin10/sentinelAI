export type EvaluationJobData = {
  traceId: string;
  evaluationId: string;
};

export const evaluationJobOptions = {
  attempts: 3,
  backoff: { type: "exponential", delay: 5000 }
} as const;

export function evaluationJobId(evaluationId: string) {
  return `evaluation-${evaluationId}`;
}
