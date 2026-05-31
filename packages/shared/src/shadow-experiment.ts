import type { TaskRiskLevel } from "./model-catalog";
import { classifyReplayRun, deriveSwitchRecommendationStatus } from "./replay-verdict";

export type ShadowRunResult = {
  semanticScore: number;
  hallucinationScore: number;
  passed: boolean;
  verdict: "pass" | "borderline" | "fail";
};

export function evaluateShadowRun(
  semanticScore: number,
  hallucinationScore: number,
  qualityThreshold: number,
  riskLevel: TaskRiskLevel
): ShadowRunResult {
  const explanation = classifyReplayRun({
    semanticScore,
    hallucinationScore,
    qualityThreshold,
    riskLevel
  });
  return {
    semanticScore,
    hallucinationScore,
    passed: explanation.verdict === "pass",
    verdict: explanation.verdict
  };
}

/**
 * Experiment queue completion (enough samples). `experimentPassed` means the run finished
 * with a switch verdict other than DO_NOT_SWITCH — map DB status PASSED/FAILED from this.
 */
export function evaluateShadowExperimentCompletion(
  passedRuns: number,
  borderlineRuns: number,
  failedRuns: number,
  criticalFailures: number,
  sampleSize: number
) {
  const completedRuns = passedRuns + borderlineRuns + failedRuns;
  if (completedRuns === 0) {
    return { complete: false, experimentPassed: false, switchStatus: "NOT_RUN" as const };
  }

  const complete = completedRuns >= Math.min(sampleSize, 5);
  const switchStatus = deriveSwitchRecommendationStatus({
    passedRuns,
    borderlineRuns,
    failedRuns,
    criticalFailures,
    experimentStatus: "PASSED"
  });
  const experimentPassed = complete && switchStatus !== "DO_NOT_SWITCH";

  return { complete, experimentPassed, switchStatus };
}
