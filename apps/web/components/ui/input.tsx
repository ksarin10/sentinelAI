import { InputHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-lg border border-border bg-muted/40 px-3.5 text-sm text-foreground shadow-panel outline-none transition placeholder:text-muted-foreground/70 focus:border-primary/45 focus:bg-card focus:ring-2 focus:ring-primary/10",
        className,
      )}
      {...props}
    />
  );
}
