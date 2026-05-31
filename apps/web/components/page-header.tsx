import { cn } from "../lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  children,
  className,
  hero
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
      <section className={cn("hero-surface relative p-6 sm:p-8", className)}>
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            {eyebrow ? (
              <span className="inline-flex items-center rounded-full border border-accent/25 bg-accent/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-accent">
                {eyebrow}
              </span>
            ) : null}
            <h1 className="font-display mt-4 text-[1.75rem] leading-[1.15] tracking-tight text-foreground sm:text-4xl">
              {title}
            </h1>
            {description ? (
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-[15px]">{description}</p>
            ) : null}
          </div>
          {children ? <div className="flex shrink-0 flex-wrap items-center gap-2">{children}</div> : null}
        </div>
      </section>
    );
  }

  return (
    <div className={cn("flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="max-w-2xl">
        {eyebrow ? (
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-accent">{eyebrow}</p>
        ) : null}
        <h1 className="font-display mt-2 text-3xl tracking-tight text-foreground sm:text-[2rem]">{title}</h1>
        {description ? <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p> : null}
      </div>
      {children ? <div className="flex shrink-0 flex-wrap items-center gap-2">{children}</div> : null}
    </div>
  );
}
