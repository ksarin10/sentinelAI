import { cn } from "../lib/utils";

const variants = {
  error: "border-red-200/80 bg-red-50 text-red-800",
  success: "border-primary/20 bg-primary/[0.07] text-primary",
  notice: "border-border bg-muted text-foreground"
};

export function AlertBanner({
  variant = "notice",
  children,
  className
}: {
  variant?: keyof typeof variants;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border px-4 py-3 text-sm leading-relaxed", variants[variant], className)}>
      {children}
    </div>
  );
}
