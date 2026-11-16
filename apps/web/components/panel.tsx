import { cn } from "../lib/utils";

export function Panel({
  title,
  description,
  action,
  children,
  className,
  padding = true,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  padding?: boolean;
}) {
  return (
    <section className={cn("glass-card overflow-hidden", className)}>
      {title ? (
        <div className="flex items-start justify-between gap-4 border-b border-border/80 bg-white/[0.012] px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-sm font-semibold tracking-[-0.01em] text-foreground">
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
          {action}
        </div>
      ) : null}
      <div className={padding ? "p-5 sm:p-6" : undefined}>{children}</div>
    </section>
  );
}
