import { ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export function Button({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-panel transition hover:-translate-y-px hover:opacity-95 disabled:translate-y-0 disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}
