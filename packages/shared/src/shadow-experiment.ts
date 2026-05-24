import type { TaskRiskLevel } from "./model-catalog";

export type ShadowRunResult = {
  semanticScore: number;
  hallucinationScore: number;
  passed: boolean;
};

function maxHallucinationRisk(riskLevel: TaskRiskLevel) {
  if (riskLevel === "HIGH") {
    return 0.15;
  }
  if (riskLevel === "LOW") {
    return 0.35;
  }
  return 0.25;
}

export function evaluateShadowRun(
  semanticScore: number,
  hallucinationScore: number,
  qualityThreshold: number,
  riskLevel: TaskRiskLevel
): ShadowRunResult {
  const passed = semanticScore >= qualityThreshold && hallucinationScore <= maxHallucinationRisk(riskLevel);
  return { semanticScore, hallucinationScore, passed };
}

export function evaluateShadowExperimentCompletion(passedRuns: number, failedRuns: number, sampleSize: number) {
  const completedRuns = passedRuns + failedRuns;
  if (completedRuns === 0) {
    return { complete: false, passed: false };
  }

  const targetRuns = Math.min(sampleSize, completedRuns);
  const requiredPasses = Math.max(3, Math.ceil(targetRuns * 0.8));
  const complete = completedRuns >= Math.min(sampleSize, 5);
  const passed = complete && passedRuns >= requiredPasses;

  return { complete, passed };
}
