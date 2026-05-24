import { TIER_A_JUDGE_METRICS, TIER_B_JUDGE_METRICS, type JudgeMetric } from "./types";

export const DEFAULT_JUDGE_RUBRIC_VERSION = "default/v1";

export const DEFAULT_JUDGE_METRICS: JudgeMetric[] = [...TIER_A_JUDGE_METRICS, ...TIER_B_JUDGE_METRICS];

export function buildJudgeSystemPrompt(metrics: JudgeMetric[]) {
  const metricLines = metrics
    .map((metric) => {
      if (metric === "hallucination_risk") {
        return `- ${metric}: 0 to 1 where 1 means high risk of unsupported claims vs prompt/context`;
      }
      return `- ${metric}: 0 to 1 where 1 means best quality`;
    })
    .join("\n");

  return [
    "You are an evaluation judge for LLM outputs.",
    "Score only using the user prompt, optional context, and model response.",
    "Return strict JSON with numeric scores for each requested metric plus a short rationale string.",
    "Do not include markdown or extra keys.",
    "",
    "Metrics:",
    metricLines,
    "",
    `Example shape: { ${metrics.map((m) => `"${m}": 0.0`).join(", ")}, "rationale": "..." }`
  ].join("\n");
}
