import { ArrowRight } from "lucide-react";
import { cn } from "../lib/utils";

export function ModelSwitchPill({
  from,
  to,
  className
}: {
  from: string;
  to: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex flex-wrap items-center gap-2 rounded-full border border-primary/20 bg-primary/[0.06] px-3.5 py-2 text-sm shadow-panel",
        className
      )}
    >
      <span className="font-medium text-foreground">{from}</span>
      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
      <span className="font-semibold text-primary">{to}</span>
    </div>
  );
}
