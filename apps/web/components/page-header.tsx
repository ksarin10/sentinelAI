import { cn } from "../lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  children,
  className,
  hero,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
  hero?: boolean;
}) {
  if (hero) {
    return (
      <section
        className={cn("relative border-b border-border pb-7 pt-1", className)}
      >
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            {eyebrow ? (
              <span className="inline-flex items-center gap-2 font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-primary">
                <span className="signal-dot" />
                {eyebrow}
              </span>
            ) : null}
            <h1 className="font-display mt-4 text-[2rem] leading-[1.05] tracking-[-0.04em] text-foreground sm:text-[2.65rem]">
              {title}
            </h1>
            {description ? (
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
                {description}
              </p>
            ) : null}
          </div>
          {children ? (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {children}
            </div>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-5 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="max-w-2xl">
        {eyebrow ? (
          <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-primary">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="font-display mt-2 text-3xl tracking-[-0.035em] text-foreground sm:text-[2rem]">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {children ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {children}
        </div>
      ) : null}
    </div>
  );
}
