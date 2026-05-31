import { ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md";

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50",
        size === "sm" ? "h-9 px-3.5 text-sm" : "h-10 px-4 text-sm",
        variant === "primary" &&
          "bg-primary-gradient text-primary-foreground shadow-glow hover:brightness-110 active:scale-[0.98]",
        variant === "secondary" &&
          "border border-border bg-card text-foreground shadow-panel hover:border-primary/25 hover:bg-muted/80",
        variant === "ghost" && "text-muted-foreground hover:bg-muted hover:text-foreground",
        className
      )}
      {...props}
    />
  );
}
