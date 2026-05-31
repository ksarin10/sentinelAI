import type { VerificationDetailRecord, VerificationRecord } from "../lib/types";
import { ModelSwitchPill } from "./model-switch-pill";
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
  const totalRuns =
    verification.totalReplayRuns || verification.passedRuns + verification.borderlineRuns + verification.failedRuns;
  const sampleSize = replaySampleSize ?? totalRuns;
  const avgQuality = detail?.averageQualityScore ?? verification.averageQualityScore;

  return (
    <section className="hero-surface overflow-hidden shadow-lift">
      <div className="border-b border-primary/10 px-6 py-5 sm:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent">Verified model switch</p>
            <h2 className="font-display mt-2 text-2xl tracking-tight text-foreground">{verification.taskName}</h2>
          </div>
          <SwitchStatusBadge status={verification.switchStatus} size="lg" />
        </div>
        <div className="mt-4">
          <ModelSwitchPill from={verification.currentModel} to={verification.candidateModel} />
        </div>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground">{verification.summarySentence}</p>
      </div>

      <dl className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Prompts replayed", value: sampleSize || "—" },
          {
            label: "Pass / borderline / fail",
            value: `${verification.passedRuns} / ${verification.borderlineRuns} / ${verification.failedRuns}`
          },
          { label: "Avg quality", value: avgQuality != null ? avgQuality.toFixed(2) : "—" },
          {
            label: "Est. monthly savings",
            value: (
              <>
                {formatUsd(verification.estimatedMonthlySavingsUsd)}
                {verification.estimatedSavingsPercent != null ? (
                  <span className="ml-1 text-sm font-normal text-muted-foreground">
                    ({verification.estimatedSavingsPercent}%)
                  </span>
                ) : null}
              </>
            )
          }
        ].map((item) => (
          <div key={item.label} className="bg-card px-5 py-4 sm:px-6">
            <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{item.label}</dt>
            <dd className="mt-1.5 text-lg font-semibold tabular-nums text-foreground">{item.value}</dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-border px-6 py-4 text-sm sm:px-8">
        <span>
          Pass rate{" "}
          <strong className="text-foreground">
            {verification.passRate != null ? `${(verification.passRate * 100).toFixed(1)}%` : "—"}
          </strong>
        </span>
        <span>
          Sample <strong className="text-foreground">{sampleSize} traces</strong>
        </span>
        <span className="text-muted-foreground">
          <strong className="text-foreground">{verification.sampleConfidence.label}</strong> —{" "}
          {verification.sampleConfidence.detail}
        </span>
      </div>
    </section>
  );
}
