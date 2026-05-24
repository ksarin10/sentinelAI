import { scoreTraceEvaluation } from "./run-evaluation";

export async function scoreShadowCandidate(prompt: string, response: string, metadata: unknown = null) {
  const scores = await scoreTraceEvaluation(prompt, response, metadata);
  const semantic = scores.find((entry) => entry.metric === "semantic_similarity")?.score ?? 0;
  const hallucination = scores.find((entry) => entry.metric === "hallucination_risk")?.score ?? 1;
  return { semantic, hallucination };
}
