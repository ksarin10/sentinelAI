import type { TaskRiskLevel } from "./model-catalog";
import type { SwitchRecommendationStatus } from "./switch-recommendation";

export type ReplayVerdict = "pass" | "borderline" | "fail";

export type ReplayRiskCategory =
  | "none"
  | "missing_detail"
  | "incorrect_fact"
  | "tone_regression"
  | "safety_issue"
  | "low_similarity";

export type ReplayExplanation = {
  verdict: ReplayVerdict;
  reason: string;
  riskCategory: ReplayRiskCategory;
  critical: boolean;
};

export type ReplayAggregate = {
  passedRuns: number;
  borderlineRuns: number;
  failedRuns: number;
  criticalFailures: number;
  totalRuns: number;
  passRate: number | null;
};

function maxHallucinationRisk(riskLevel: TaskRiskLevel = "MEDIUM") {
  if (riskLevel === "HIGH") {
    return 0.15;
  }
  if (riskLevel === "LOW") {
    return 0.35;
  }
  return 0.25;
}

export function classifyReplayRun(input: {
  semanticScore: number;
  hallucinationScore: number;
  qualityThreshold: number;
  riskLevel?: TaskRiskLevel;
  replayFailed?: boolean;
}): ReplayExplanation {
  if (input.replayFailed) {
    return {
      verdict: "fail",
      reason: "Candidate model did not return a response during shadow replay.",
      riskCategory: "low_similarity",
      critical: true
    };
  }

  const threshold = input.qualityThreshold;
  const maxRisk = maxHallucinationRisk(input.riskLevel ?? "MEDIUM");

  if (input.hallucinationScore > maxRisk + 0.1 || input.hallucinationScore > 0.45) {
    return {
      verdict: "fail",
      reason: "Hallucination risk exceeded the safe band for this task profile.",
      riskCategory: "safety_issue",
      critical: true
    };
  }

  if (input.semanticScore >= threshold && input.hallucinationScore <= maxRisk) {
    return {
      verdict: "pass",
      reason: "Candidate response matched baseline intent within your quality threshold.",
      riskCategory: "none",
      critical: false
    };
  }

  if (input.semanticScore >= threshold - 0.06 && input.hallucinationScore <= maxRisk + 0.05) {
    return {
      verdict: "borderline",
      reason: "Quality was close to threshold; review before switching high-risk traffic.",
      riskCategory: input.semanticScore < threshold ? "missing_detail" : "tone_regression",
      critical: false
    };
  }

  if (input.semanticScore < 0.55) {
    return {
      verdict: "fail",
      reason: "Candidate response diverged materially from the original answer.",
      riskCategory: "incorrect_fact",
      critical: true
    };
  }

  if (input.hallucinationScore > maxRisk) {
    return {
      verdict: "fail",
      reason: "Candidate response introduced unsupported or risky content.",
      riskCategory: "safety_issue",
      critical: true
    };
  }

  return {
    verdict: "fail",
    reason: "Semantic similarity fell below the task quality threshold.",
    riskCategory: "missing_detail",
    critical: false
  };
}

export function aggregateReplayRuns(
  runs: Array<{ explanation: ReplayExplanation }>
): ReplayAggregate {
  let passedRuns = 0;
  let borderlineRuns = 0;
  let failedRuns = 0;
  let criticalFailures = 0;

  for (const run of runs) {
    if (run.explanation.verdict === "pass") {
      passedRuns += 1;
    } else if (run.explanation.verdict === "borderline") {
      borderlineRuns += 1;
    } else {
      failedRuns += 1;
    }
    if (run.explanation.critical) {
      criticalFailures += 1;
    }
  }

  const totalRuns = passedRuns + borderlineRuns + failedRuns;
  return {
    passedRuns,
    borderlineRuns,
    failedRuns,
    criticalFailures,
    totalRuns,
    passRate: totalRuns === 0 ? null : passedRuns / totalRuns
  };
}

export function deriveSwitchRecommendationStatus(input: {
  passedRuns: number;
  borderlineRuns: number;
  failedRuns: number;
  criticalFailures: number;
  experimentStatus: "QUEUED" | "RUNNING" | "PASSED" | "FAILED" | string;
}): SwitchRecommendationStatus {
  if (input.experimentStatus === "QUEUED" || input.experimentStatus === "RUNNING") {
    return "VERIFYING";
  }

  const total = input.passedRuns + input.borderlineRuns + input.failedRuns;
  if (total === 0) {
    return input.experimentStatus === "FAILED" ? "DO_NOT_SWITCH" : "NOT_RUN";
  }

  const rate = input.passedRuns / total;
  if (rate >= 0.9 && input.criticalFailures === 0) {
    return "SAFE_TO_SWITCH";
  }
  if (rate >= 0.75) {
    return "NEEDS_REVIEW";
  }
  return "DO_NOT_SWITCH";
}

export function passRateFromAggregate(aggregate: Pick<ReplayAggregate, "passedRuns" | "totalRuns">) {
  if (aggregate.totalRuns === 0) {
    return null;
  }
  return aggregate.passedRuns / aggregate.totalRuns;
}

export type SampleConfidenceLevel = "high" | "moderate" | "limited";

export function buildSampleConfidence(totalRuns: number): {
  level: SampleConfidenceLevel;
  label: string;
  detail: string;
} {
  if (totalRuns >= 20) {
    return {
      level: "high",
      label: "Strong sample",
      detail: "Sample size is large enough for a confident production decision."
    };
  }
  if (totalRuns >= 12) {
    return {
      level: "moderate",
      label: "Moderate sample",
      detail: "Directionally reliable; ingest more traces to tighten confidence."
    };
  }
  return {
    level: "limited",
    label: "Limited sample",
    detail: `Pass rate is based on ${totalRuns} replayed traces. Run with 20+ traces for stronger confidence.`
  };
}

export function buildVerificationSummarySentence(input: {
  taskName: string;
  passedRuns: number;
  borderlineRuns: number;
  failedRuns: number;
  totalRuns: number;
  estimatedSavingsPercent: number | null;
  switchStatus: SwitchRecommendationStatus;
}) {
  const savings =
    input.estimatedSavingsPercent != null ? `estimated cost drops by ${input.estimatedSavingsPercent}%` : "cost should decrease on this traffic";
  const sample = `${input.passedRuns}/${input.totalRuns} sampled prompts passed`;
  const borderline =
    input.borderlineRuns > 0 ? ` (${input.borderlineRuns} borderline)` : "";

  if (input.switchStatus === "SAFE_TO_SWITCH") {
    return `SentinelAI recommends switching because ${sample}${borderline} and ${savings}.`;
  }
  if (input.switchStatus === "NEEDS_REVIEW") {
    return `SentinelAI found a likely savings opportunity (${savings}), but ${sample}${borderline} — review before switching.`;
  }
  if (input.switchStatus === "DO_NOT_SWITCH") {
    return `Do not switch yet: only ${sample} met the quality bar on your production prompts.`;
  }
  return `Shadow verification is still running for ${input.taskName}.`;
}

/** @deprecated Use deriveSwitchRecommendationStatus with borderline/critical counts */
export function passRate(passedRuns: number, failedRuns: number) {
  const total = passedRuns + failedRuns;
  if (total === 0) {
    return null;
  }
  return passedRuns / total;
}
