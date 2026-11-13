import { scoreTraceEvaluation } from "./run-evaluation";
import { semanticSimilarity } from "./scoring";
import type { EvidenceQuality } from "@prisma/client";

export type TraceForShadowScoring = {
  prompt: string;
  response: string | null;
  metadata: unknown;
  evaluations: Array<{
    status: string;
    scores: Array<{ metric: string; score: number; details?: unknown }>;
  }>;
};

export async function scoreShadowCandidate(
  prompt: string,
  response: string,
  metadata: unknown = null,
) {
  const scores = await scoreTraceEvaluation(prompt, response, metadata);
  const semanticScore = scores.find(
    (entry) => entry.metric === "semantic_similarity",
  );
  const hallucinationScore = scores.find(
    (entry) => entry.metric === "hallucination_risk",
  );
  const judged = [semanticScore, hallucinationScore].every((entry) => {
    const details = entry?.details as Record<string, unknown> | undefined;
    return (
      typeof details?.method === "string" &&
      details.method.startsWith("llm_judge") &&
      details.judgeFallback !== true
    );
  });
  return {
    semantic: semanticScore?.score ?? 0,
    hallucination: hallucinationScore?.score ?? 1,
    evidenceQuality: (judged ? "JUDGED" : "HEURISTIC") as EvidenceQuality,
  };
}

function scoresFromCompletedEvaluation(trace: TraceForShadowScoring) {
  const evaluation = trace.evaluations.find(
    (entry) => entry.status === "COMPLETED",
  );
  if (!evaluation) {
    return null;
  }

  const semantic = evaluation.scores.find(
    (entry) => entry.metric === "semantic_similarity",
  )?.score;
  const hallucination = evaluation.scores.find(
    (entry) => entry.metric === "hallucination_risk",
  )?.score;
  if (semantic == null || hallucination == null) {
    return null;
  }

  return { semantic, hallucination };
}

export async function scoreShadowReplayRun(
  trace: TraceForShadowScoring,
  baselineResponse: string,
  candidateResponse: string,
  options: { isCrossProvider: boolean; usedSimulate: boolean },
) {
  if (!options.isCrossProvider && options.usedSimulate) {
    const fromEvaluation = scoresFromCompletedEvaluation(trace);
    if (fromEvaluation) {
      return { ...fromEvaluation, evidenceQuality: "DEMO" as EvidenceQuality };
    }

    return {
      semantic: semanticSimilarity(baselineResponse, candidateResponse).score,
      hallucination: (
        await scoreShadowCandidate(
          trace.prompt,
          candidateResponse,
          trace.metadata,
        )
      ).hallucination,
      evidenceQuality: "DEMO" as EvidenceQuality,
    };
  }

  return scoreShadowCandidate(trace.prompt, candidateResponse, trace.metadata);
}
