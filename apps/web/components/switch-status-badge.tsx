import type { SwitchRecommendationStatus } from "@sentinelai/shared";
import { switchStatusLabel } from "@sentinelai/shared";
import { cn } from "../lib/utils";

const styles: Record<SwitchRecommendationStatus, string> = {
  SAFE_TO_SWITCH: "bg-primary/10 text-primary ring-primary/25",
  NEEDS_REVIEW: "bg-amber-50 text-amber-900 ring-amber-200/80",
  DO_NOT_SWITCH: "bg-red-50 text-red-800 ring-red-200/80",
  VERIFYING: "bg-sky-50 text-sky-900 ring-sky-200/80",
  NOT_RUN: "bg-muted text-muted-foreground ring-border"
};

export function SwitchStatusBadge({
  status,
  size = "default"
}: {
  status: SwitchRecommendationStatus;
  size?: "default" | "lg";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-semibold ring-1",
        size === "lg" ? "px-3.5 py-1.5 text-sm" : "px-2.5 py-1 text-xs",
        styles[status]
      )}
    >
      {switchStatusLabel(status)}
    </span>
  );
}
