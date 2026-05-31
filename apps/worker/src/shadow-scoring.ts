import { scoreTraceEvaluation } from "./run-evaluation";
import { semanticSimilarity } from "./scoring";

export type TraceForShadowScoring = {
  prompt: string;
  response: string | null;
  metadata: unknown;
  evaluations: Array<{
    status: string;
    scores: Array<{ metric: string; score: number }>;
  }>;
};

export async function scoreShadowCandidate(prompt: string, response: string, metadata: unknown = null) {
  const scores = await scoreTraceEvaluation(prompt, response, metadata);
  const semantic = scores.find((entry) => entry.metric === "semantic_similarity")?.score ?? 0;
  const hallucination = scores.find((entry) => entry.metric === "hallucination_risk")?.score ?? 1;
  return { semantic, hallucination };
}

function scoresFromCompletedEvaluation(trace: TraceForShadowScoring) {
  const evaluation = trace.evaluations.find((entry) => entry.status === "COMPLETED");
  if (!evaluation) {
    return null;
  }

  const semantic = evaluation.scores.find((entry) => entry.metric === "semantic_similarity")?.score;
  const hallucination = evaluation.scores.find((entry) => entry.metric === "hallucination_risk")?.score;
  if (semantic == null || hallucination == null) {
    return null;
  }

  return { semantic, hallucination };
}

export async function scoreShadowReplayRun(
  trace: TraceForShadowScoring,
  baselineResponse: string,
  candidateResponse: string,
  options: { isCrossProvider: boolean; usedSimulate: boolean }
) {
  if (!options.isCrossProvider && options.usedSimulate) {
    const fromEvaluation = scoresFromCompletedEvaluation(trace);
    if (fromEvaluation) {
      return fromEvaluation;
    }

    return {
      semantic: semanticSimilarity(baselineResponse, candidateResponse).score,
      hallucination: (await scoreShadowCandidate(trace.prompt, candidateResponse, trace.metadata)).hallucination
    };
  }

  return scoreShadowCandidate(trace.prompt, candidateResponse, trace.metadata);
}
