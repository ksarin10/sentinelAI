import { cn } from "../lib/utils";

type Props = {
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
  className?: string;
  variant?: "light" | "dark";
};

const sizes = { sm: 32, md: 40, lg: 48 };

export function BrandLogo({
  size = "md",
  showWordmark = false,
  className,
  variant = "dark",
}: Props) {
  const px = sizes[size];
  const textClass = variant === "dark" ? "text-white" : "text-foreground";
  const subClass =
    variant === "dark" ? "text-white/50" : "text-muted-foreground";

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <svg
        width={px}
        height={px}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
        className="shrink-0 drop-shadow-[0_0_14px_hsl(81_88%_64%/0.18)]"
      >
        <defs>
          <linearGradient
            id="sentinel-mark"
            x1="8"
            y1="6"
            x2="40"
            y2="42"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#d5ff76" />
            <stop offset="1" stopColor="#95d62d" />
          </linearGradient>
        </defs>
        <rect
          x="2.5"
          y="2.5"
          width="43"
          height="43"
          rx="11"
          fill="#0d0f12"
          stroke="#2a2e35"
        />
        <circle cx="24" cy="24" r="14" stroke="#2c3138" />
        <circle cx="24" cy="24" r="9" stroke="#3a4048" strokeDasharray="2 3" />
        <path
          d="M24 8V13M24 35V40M8 24H13M35 24H40"
          stroke="#515862"
          strokeLinecap="round"
        />
        <path
          d="M18 24.5L22.2 28.5L30.5 19.5"
          stroke="url(#sentinel-mark)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="24" cy="24" r="2" fill="#d5ff76" />
      </svg>
      {showWordmark ? (
        <div>
          <div
            className={cn(
              "text-sm font-semibold tracking-[-0.02em]",
              textClass,
            )}
          >
            SentinelAI
          </div>
          <div
            className={cn(
              "font-mono text-[9px] uppercase tracking-[0.14em]",
              subClass,
            )}
          >
            Model intelligence
          </div>
        </div>
      ) : null}
    </div>
  );
}
