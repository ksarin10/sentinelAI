import { InputHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn("h-10 rounded-md border border-border bg-white/90 px-3 text-sm outline-none ring-primary/20 transition focus:border-primary focus:ring-4", className)} {...props} />;
}
