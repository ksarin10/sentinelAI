export function evaluateShadowRun(
  semanticScore: number,
  hallucinationScore: number,
  qualityThreshold: number,
  maxHallucination: number
) {
  const passed = semanticScore >= qualityThreshold && hallucinationScore <= maxHallucination;
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
