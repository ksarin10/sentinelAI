import { cn } from "../lib/utils";

const variants = {
  error: "border-red-400/20 bg-red-400/[0.07] text-red-300",
  success: "border-primary/20 bg-primary/[0.07] text-primary",
  notice: "border-border bg-muted/60 text-foreground",
};

export function AlertBanner({
  variant = "notice",
  children,
  className,
}: {
  variant?: keyof typeof variants;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border px-4 py-3 text-sm leading-relaxed shadow-panel",
        variants[variant],
        className,
      )}
    >
      {children}
    </div>
  );
}
