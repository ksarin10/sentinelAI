import type { LucideIcon } from "lucide-react";
import { cn } from "../lib/utils";

export function StatCard({
  label,
  value,
  hint,
  highlight,
  icon: Icon,
  className,
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
        "group relative min-h-[9.5rem] overflow-hidden rounded-xl border bg-card p-5 shadow-panel transition duration-200 hover:-translate-y-0.5 hover:shadow-lift",
        highlight
          ? "border-primary/25 shadow-glow"
          : "border-border hover:border-white/15",
        className,
      )}
    >
      {highlight ? (
        <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-primary/10 blur-3xl" />
      ) : null}
      <div className="relative flex items-start justify-between gap-3">
        <p className="font-mono text-[9px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </p>
        {Icon ? (
          <span
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg border transition",
              highlight
                ? "border-primary/20 bg-primary/10 text-primary"
                : "border-border bg-muted/60 text-muted-foreground group-hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
          </span>
        ) : null}
      </div>
      <div
        className={cn(
          "relative mt-4 text-[1.65rem] font-medium tracking-[-0.04em]",
          highlight && "text-primary",
        )}
      >
        {value}
      </div>
      {hint ? (
        <p className="relative mt-2 font-mono text-[10px] leading-relaxed text-muted-foreground">
          {hint}
        </p>
      ) : null}
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </div>
  );
}
