import type { LucideIcon } from "lucide-react";
import { cn } from "../lib/utils";

export function StatCard({
  label,
  value,
  hint,
  highlight,
  icon: Icon,
  className
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  highlight?: boolean;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border bg-card p-5 shadow-panel transition hover:shadow-lift",
        highlight ? "border-primary/30 shadow-glow" : "border-border hover:border-primary/20",
        className
      )}
    >
      {highlight ? (
        <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-primary/15 blur-2xl" />
      ) : null}
      <div className="relative flex items-start justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
        {Icon ? (
          <span
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-xl transition",
              highlight ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
            )}
          >
            <Icon className="h-4 w-4" />
          </span>
        ) : null}
      </div>
      <div className={cn("relative mt-3 text-2xl font-bold tracking-tight", highlight && "text-primary")}>{value}</div>
      {hint ? <p className="relative mt-2 text-xs leading-relaxed text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
