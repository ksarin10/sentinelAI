export type SwitchRecommendationStatus =
  | "SAFE_TO_SWITCH"
  | "NEEDS_REVIEW"
  | "DO_NOT_SWITCH"
  | "VERIFYING"
  | "NOT_RUN";

export { deriveSwitchRecommendationStatus, passRate } from "./replay-verdict";

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
