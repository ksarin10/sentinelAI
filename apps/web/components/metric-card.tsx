import { LucideIcon } from "lucide-react";
import { Card } from "./ui/card";

export function MetricCard({ label, value, hint, icon: Icon }: { label: string; value: string; hint: string; icon: LucideIcon }) {
  return (
    <Card className="relative overflow-hidden p-5">
      <div className="absolute inset-x-0 top-0 h-1 bg-primary" />
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
          <div className="mt-3 text-3xl font-semibold tracking-normal">{value}</div>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-md border border-border bg-muted text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">{hint}</div>
    </Card>
  );
}
