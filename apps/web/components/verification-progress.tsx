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
        className="rounded-2xl border border-primary/20 bg-primary/[0.06] p-5 shadow-panel"
        role="status"
        aria-live="polite"
      >
        <div className="flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" aria-hidden />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-primary">
              {phase === "already_verified" ? "Already verified" : "Verification complete"}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{message}</p>
            {taskName ? (
              <Link
                href={`/verification?task=${encodeURIComponent(taskName)}`}
                className="mt-2 inline-block text-sm font-semibold text-primary hover:underline"
              >
                View replay evidence →
              </Link>
            ) : (
              <Link href="/verification" className="mt-2 inline-block text-sm font-semibold text-primary hover:underline">
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
    <div className="rounded-2xl border border-primary/20 bg-card p-5 shadow-panel" role="status" aria-live="polite">
      <div className="flex items-center gap-3">
        <Loader2 className="h-5 w-5 shrink-0 animate-spin text-primary" aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">Shadow verification in progress</div>
          <p className="mt-1 text-sm text-muted-foreground">{message}</p>
        </div>
        <div className="text-sm font-bold tabular-nums text-primary">{clamped}%</div>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${clamped}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Replaying sampled production prompts — usually 30–90 seconds.
      </p>
    </div>
  );
}
