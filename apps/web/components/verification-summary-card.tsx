import { ArrowRight } from "lucide-react";
import type { VerificationDetailRecord, VerificationRecord } from "../lib/types";
import { SwitchStatusBadge } from "./switch-status-badge";

type Props = {
  verification: VerificationRecord;
  detail?: VerificationDetailRecord | null;
  replaySampleSize?: number;
};

function formatUsd(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) {
    return "—";
  }
  return `$${value.toFixed(0)}/mo`;
}

export function VerificationSummaryCard({ verification, detail, replaySampleSize }: Props) {
  const totalRuns = verification.totalReplayRuns || verification.passedRuns + verification.borderlineRuns + verification.failedRuns;
  const sampleSize = replaySampleSize ?? totalRuns;
  const avgQuality = detail?.averageQualityScore ?? verification.averageQualityScore;

  return (
    <section className="rounded-lg border border-[#9ad7cf] bg-gradient-to-br from-[#e8f7f4] to-white p-6 shadow-panel">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0d6b5c]">Verified model switch</p>
          <h2 className="mt-1 text-xl font-semibold text-[#0a3d34]">{verification.taskName}</h2>
        </div>
        <SwitchStatusBadge status={verification.switchStatus} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-[#0d6b5c]/90">
        <span className="font-medium">{verification.currentModel}</span>
        <ArrowRight className="h-4 w-4" />
        <span className="font-medium">{verification.candidateModel}</span>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-[#0a3d34]/85">{verification.summarySentence}</p>

      <dl className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-md bg-white/70 p-3 ring-1 ring-[#9ad7cf]/60">
          <dt className="text-xs uppercase tracking-wide text-muted-foreground">Production prompts replayed</dt>
          <dd className="mt-1 text-lg font-semibold">{sampleSize || "—"}</dd>
        </div>
        <div className="rounded-md bg-white/70 p-3 ring-1 ring-[#9ad7cf]/60">
          <dt className="text-xs uppercase tracking-wide text-muted-foreground">Pass / borderline / fail</dt>
          <dd className="mt-1 text-lg font-semibold">
            {verification.passedRuns} / {verification.borderlineRuns} / {verification.failedRuns}
          </dd>
        </div>
        <div className="rounded-md bg-white/70 p-3 ring-1 ring-[#9ad7cf]/60">
          <dt className="text-xs uppercase tracking-wide text-muted-foreground">Avg quality score</dt>
          <dd className="mt-1 text-lg font-semibold">{avgQuality != null ? avgQuality.toFixed(2) : "—"}</dd>
        </div>
        <div className="rounded-md bg-white/70 p-3 ring-1 ring-[#9ad7cf]/60">
          <dt className="text-xs uppercase tracking-wide text-muted-foreground">Est. monthly savings</dt>
          <dd className="mt-1 text-lg font-semibold text-primary">
            {formatUsd(verification.estimatedMonthlySavingsUsd)}
            {verification.estimatedSavingsPercent != null ? (
              <span className="ml-1 text-sm font-normal text-muted-foreground">({verification.estimatedSavingsPercent}%)</span>
            ) : null}
          </dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap gap-4 rounded-md border border-[#9ad7cf]/50 bg-white/60 px-4 py-3 text-sm">
        <span>
          Pass rate:{" "}
          <strong>{verification.passRate != null ? `${(verification.passRate * 100).toFixed(1)}%` : "—"}</strong>
        </span>
        <span>
          Sample size: <strong>{sampleSize} traces</strong>
        </span>
        <span>
          Confidence: <strong>{verification.sampleConfidence.label}</strong>
          <span className="text-muted-foreground"> — {verification.sampleConfidence.detail}</span>
        </span>
      </div>
    </section>
  );
}
