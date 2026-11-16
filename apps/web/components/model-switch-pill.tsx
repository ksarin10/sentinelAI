import { ArrowRight } from "lucide-react";
import { cn } from "../lib/utils";

export function ModelSwitchPill({
  from,
  to,
  className,
}: {
  from: string;
  to: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 font-mono text-xs shadow-panel",
        className,
      )}
    >
      <span className="font-medium text-foreground">{from}</span>
      <ArrowRight className="h-3.5 w-3.5 text-primary" aria-hidden />
      <span className="font-semibold text-primary">{to}</span>
    </div>
  );
}
