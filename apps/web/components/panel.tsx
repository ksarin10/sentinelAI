import { cn } from "../lib/utils";

export function Panel({
  title,
  description,
  action,
  children,
  className,
  padding = true
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  padding?: boolean;
}) {
  return (
    <section className={cn("overflow-hidden rounded-2xl border border-border bg-card shadow-panel", className)}>
      {title ? (
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-base font-semibold text-foreground">{title}</h2>
            {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
          </div>
          {action}
        </div>
      ) : null}
      <div className={padding ? "p-5 sm:p-6" : undefined}>{children}</div>
    </section>
  );
}
