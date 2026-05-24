export const TIER_A_JUDGE_METRICS = ["semantic_similarity", "hallucination_risk", "instruction_following"] as const;

export const TIER_B_JUDGE_METRICS = ["politeness", "conciseness", "coherence", "tone_match", "clarity"] as const;

export type TierAJudgeMetric = (typeof TIER_A_JUDGE_METRICS)[number];
export type TierBJudgeMetric = (typeof TIER_B_JUDGE_METRICS)[number];
export type JudgeMetric = TierAJudgeMetric | TierBJudgeMetric;

export type JudgeScores = Record<JudgeMetric, number> & {
  rationale: string;
};

export type JudgeRequest = {
  prompt: string;
  response: string;
  context?: string;
  metrics?: JudgeMetric[];
};

export type JudgeResult = {
  method: "llm_judge_v1";
  model: string;
  rubricVersion: string;
  scores: JudgeScores;
};
