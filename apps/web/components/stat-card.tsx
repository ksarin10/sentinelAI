import { cn } from "../lib/utils";

export function StatCard({
  label,
  value,
  hint,
  highlight,
  className
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  highlight?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card p-5 shadow-panel",
        highlight && "border-primary/25 bg-gradient-to-br from-primary/[0.06] to-card",
        className
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <div className={cn("mt-2 text-2xl font-semibold tracking-tight", highlight && "text-primary")}>{value}</div>
      {hint ? <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
