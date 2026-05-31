export type SwitchRecommendationStatus =
  | "SAFE_TO_SWITCH"
  | "NEEDS_REVIEW"
  | "DO_NOT_SWITCH"
  | "VERIFYING"
  | "NOT_RUN";

export function passRate(passedRuns: number, failedRuns: number) {
  const total = passedRuns + failedRuns;
  if (total === 0) {
    return null;
  }
  return passedRuns / total;
}

export function deriveSwitchRecommendationStatus(input: {
  passedRuns: number;
  failedRuns: number;
  experimentStatus: "QUEUED" | "RUNNING" | "PASSED" | "FAILED" | string;
}): SwitchRecommendationStatus {
  if (input.experimentStatus === "QUEUED" || input.experimentStatus === "RUNNING") {
    return "VERIFYING";
  }

  const rate = passRate(input.passedRuns, input.failedRuns);
  if (rate === null) {
    return input.experimentStatus === "FAILED" ? "DO_NOT_SWITCH" : "NOT_RUN";
  }

  if (rate >= 0.9 && input.failedRuns === 0) {
    return "SAFE_TO_SWITCH";
  }
  if (rate >= 0.75) {
    return "NEEDS_REVIEW";
  }
  return "DO_NOT_SWITCH";
}

export function switchStatusLabel(status: SwitchRecommendationStatus) {
  switch (status) {
    case "SAFE_TO_SWITCH":
      return "Safe to switch";
    case "NEEDS_REVIEW":
      return "Needs review";
    case "DO_NOT_SWITCH":
      return "Do not switch";
    case "VERIFYING":
      return "Verifying…";
    default:
      return "Not verified yet";
  }
}
