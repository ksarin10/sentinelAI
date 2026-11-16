import type { SwitchRecommendationStatus } from "@sentinelai/shared";
import { switchStatusLabel } from "@sentinelai/shared";
import { cn } from "../lib/utils";

const styles: Record<SwitchRecommendationStatus, string> = {
  SAFE_TO_SWITCH: "bg-primary/10 text-primary ring-primary/25",
  NEEDS_REVIEW: "bg-amber-400/10 text-amber-300 ring-amber-400/20",
  DO_NOT_SWITCH: "bg-red-400/10 text-red-300 ring-red-400/20",
  VERIFYING: "bg-sky-400/10 text-sky-300 ring-sky-400/20",
  NOT_RUN: "bg-muted text-muted-foreground ring-border",
};

export function SwitchStatusBadge({
  status,
  size = "default",
}: {
  status: SwitchRecommendationStatus;
  size?: "default" | "lg";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-mono font-medium uppercase tracking-[0.08em] ring-1",
        size === "lg" ? "px-3.5 py-1.5 text-sm" : "px-2.5 py-1 text-xs",
        styles[status],
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {switchStatusLabel(status)}
    </span>
  );
}
