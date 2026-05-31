import { CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";

export type VerificationUiPhase = "running" | "success" | "already_verified";

export function VerificationProgress({
  phase,
  progress,
  message,
  taskName
}: {
  phase: VerificationUiPhase | null;
  progress: number;
  message: string;
  taskName?: string | null;
}) {
  if (!phase) {
    return null;
  }

  if (phase === "success" || phase === "already_verified") {
    return (
      <div
        className="rounded-lg border border-[#9ad7cf] bg-[#e8f7f4] p-4 shadow-panel"
        role="status"
        aria-live="polite"
      >
        <div className="flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" aria-hidden />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-[#0d6b5c]">
              {phase === "already_verified" ? "Already verified" : "Verification complete"}
            </div>
            <p className="mt-0.5 text-sm text-[#0d6b5c]/80">{message}</p>
            {taskName ? (
              <Link href={`/verification?task=${encodeURIComponent(taskName)}`} className="mt-2 inline-block text-sm font-medium text-primary">
                View verification details →
              </Link>
            ) : (
              <Link href="/verification" className="mt-2 inline-block text-sm font-medium text-primary">
                Open Verification →
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  const clamped = Math.min(100, Math.max(0, progress));

  return (
    <div className="rounded-lg border border-[#9ad7cf] bg-[#e8f7f4] p-4 shadow-panel" role="status" aria-live="polite">
      <div className="flex items-center gap-3">
        <Loader2 className="h-5 w-5 shrink-0 animate-spin text-primary" aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-[#0d6b5c]">Shadow verification in progress</div>
          <p className="mt-0.5 text-sm text-[#0d6b5c]/80">{message}</p>
        </div>
        <div className="text-sm font-semibold tabular-nums text-[#0d6b5c]">{clamped}%</div>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/80">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${clamped}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-[#0d6b5c]/70">
        Replaying sampled production prompts against the candidate model. This usually takes 30–90 seconds.
      </p>
    </div>
  );
}
