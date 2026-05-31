import type { SwitchRecommendationStatus } from "@sentinelai/shared";
import { switchStatusLabel } from "@sentinelai/shared";

const styles: Record<SwitchRecommendationStatus, string> = {
  SAFE_TO_SWITCH: "bg-[#e8f7f4] text-[#0d6b5c] ring-[#9ad7cf]",
  NEEDS_REVIEW: "bg-amber-50 text-amber-900 ring-amber-200",
  DO_NOT_SWITCH: "bg-red-50 text-red-800 ring-red-200",
  VERIFYING: "bg-sky-50 text-sky-900 ring-sky-200",
  NOT_RUN: "bg-muted text-muted-foreground ring-border"
};

export function SwitchStatusBadge({ status }: { status: SwitchRecommendationStatus }) {
  return (
    <span className={`inline-flex rounded-md px-2.5 py-1 text-xs font-semibold ring-1 ${styles[status]}`}>
      {switchStatusLabel(status)}
    </span>
  );
}
