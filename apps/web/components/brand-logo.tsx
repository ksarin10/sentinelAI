import { cn } from "../lib/utils";

type Props = {
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
  className?: string;
  variant?: "light" | "dark";
};

const sizes = { sm: 32, md: 40, lg: 48 };

export function BrandLogo({ size = "md", showWordmark = false, className, variant = "dark" }: Props) {
  const px = sizes[size];
  const textClass = variant === "dark" ? "text-white" : "text-foreground";
  const subClass = variant === "dark" ? "text-white/50" : "text-muted-foreground";

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <svg
        width={px}
        height={px}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
        className="shrink-0 drop-shadow-[0_4px_12px_rgba(26,155,138,0.35)]"
      >
        <defs>
          <linearGradient id="sentinel-mark" x1="8" y1="6" x2="40" y2="42" gradientUnits="userSpaceOnUse">
            <stop stopColor="#22b8a8" />
            <stop offset="0.55" stopColor="#0d7a6f" />
            <stop offset="1" stopColor="#e85d3a" />
          </linearGradient>
          <linearGradient id="sentinel-shine" x1="14" y1="10" x2="28" y2="24" gradientUnits="userSpaceOnUse">
            <stop stopColor="white" stopOpacity="0.45" />
            <stop offset="1" stopColor="white" stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect x="2" y="2" width="44" height="44" rx="14" fill="url(#sentinel-mark)" />
        <rect x="2" y="2" width="44" height="44" rx="14" fill="url(#sentinel-shine)" />
        <path
          d="M24 11L33 16.5V25.5C33 31.5 24 37 24 37C24 37 15 31.5 15 25.5V16.5L24 11Z"
          stroke="white"
          strokeWidth="1.75"
          strokeLinejoin="round"
          fill="white"
          fillOpacity="0.12"
        />
        <path
          d="M19 24.5L22.2 27.7L29.5 20.2"
          stroke="white"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="24" cy="24" r="10" stroke="white" strokeOpacity="0.25" strokeWidth="1" strokeDasharray="2 3" />
      </svg>
      {showWordmark ? (
        <div>
          <div className={cn("text-sm font-bold tracking-tight", textClass)}>SentinelAI</div>
          <div className={cn("text-[10px] font-medium", subClass)}>Verified switching</div>
        </div>
      ) : null}
    </div>
  );
}
