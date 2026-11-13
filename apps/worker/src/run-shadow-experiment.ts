import {
  EvidenceQuality,
  PrismaClient,
  ShadowExperiment,
} from "@prisma/client";
import {
  classifyReplayRun,
  evaluateShadowExperimentCompletion,
  isCrossProviderRecommendation,
  planShadowVerification,
  readShadowEconomicsConfig,
} from "@sentinelai/shared";
import { resolveProviderApiKey } from "./resolve-provider-api-key";
import { getShadowReplayMode, replayCandidatePrompt } from "./shadow-replay";
import { scoreShadowReplayRun } from "./shadow-scoring";

function maxHallucinationRisk() {
  return 0.25;
}

async function markExperimentFromProductionTraffic(
  prisma: PrismaClient,
  experiment: ShadowExperiment,
) {
  const traces = await prisma.trace.findMany({
    where: {
      projectId: experiment.projectId,
      name: experiment.taskName,
      provider: experiment.candidateProvider,
      model: experiment.candidateModel,
      status: "SUCCESS",
    },
    include: {
      evaluations: {
        where: { status: "COMPLETED" },
        include: { scores: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  if (traces.length < 5) {
    return false;
  }

  const judgedEvaluations = traces.flatMap((trace) =>
    trace.evaluations.flatMap((evaluation) => {
      const semantic = evaluation.scores.find(
        (score) => score.metric === "semantic_similarity",
      );
      const hallucination = evaluation.scores.find(
        (score) => score.metric === "hallucination_risk",
      );
      const isJudged = [semantic, hallucination].every((score) => {
        const details = score?.details as Record<string, unknown> | null;
        return (
          typeof details?.method === "string" &&
          details.method.startsWith("llm_judge") &&
          details.judgeFallback !== true
        );
      });
      return isJudged && semantic && hallucination
        ? [{ semantic: semantic.score, hallucination: hallucination.score }]
        : [];
    }),
  );
  const semanticScores = judgedEvaluations.map(
    (evaluation) => evaluation.semantic,
  );
  const hallucinationScores = judgedEvaluations.map(
    (evaluation) => evaluation.hallucination,
  );

  if (semanticScores.length < 5) {
    return false;
  }

  const averageSemantic =
    semanticScores.reduce((sum, score) => sum + score, 0) /
    semanticScores.length;
  const averageHallucination =
    hallucinationScores.length === 0
      ? 0
      : hallucinationScores.reduce((sum, score) => sum + score, 0) /
        hallucinationScores.length;

  if (
    averageSemantic < experiment.qualityThreshold ||
    averageHallucination > maxHallucinationRisk()
  ) {
    return false;
  }

  await prisma.shadowExperiment.update({
    where: { id: experiment.id },
    data: {
      status: "PASSED",
      verificationMethod: "PRODUCTION_TRAFFIC",
      evidenceQuality: "JUDGED",
      passedRuns: semanticScores.length,
      borderlineRuns: 0,
      failedRuns: 0,
      criticalFailures: 0,
      averageCandidateSemantic: Number(averageSemantic.toFixed(3)),
      averageCandidateHallucination: Number(averageHallucination.toFixed(3)),
      reason:
        "Verified using existing production traffic on the candidate model.",
      completedAt: new Date(),
    },
  });

  return true;
}

export async function runShadowExperiment(
  prisma: PrismaClient,
  experimentId: string,
) {
  const economics = readShadowEconomicsConfig(process.env);
  const experiment = await prisma.shadowExperiment.findUnique({
    where: { id: experimentId },
  });
  if (!experiment || experiment.status !== "QUEUED") {
    return;
  }

  const isCrossProvider = isCrossProviderRecommendation(
    experiment.baselineProvider,
    experiment.candidateProvider,
  );
  const replayMode = getShadowReplayMode();
  const candidateApiKey =
    replayMode === "api"
      ? await resolveProviderApiKey(
          prisma,
          experiment.projectId,
          experiment.candidateProvider,
        )
      : null;

  const verificationPlan = planShadowVerification({
    baselineProvider: experiment.baselineProvider,
    candidateProvider: experiment.candidateProvider,
    candidateProviderHasKey: Boolean(candidateApiKey),
    shadowReplayMode: replayMode,
  });

  if (!verificationPlan.canRun) {
    await prisma.shadowExperiment.update({
      where: { id: experiment.id },
      data: {
        status: "FAILED",
        reason: verificationPlan.reason,
        completedAt: new Date(),
      },
    });
    return;
  }

  await prisma.shadowExperiment.update({
    where: { id: experiment.id },
    data: {
      status: "RUNNING",
      reason: null,
      passedRuns: 0,
      borderlineRuns: 0,
      failedRuns: 0,
      criticalFailures: 0,
      verificationMethod: "UNVERIFIED",
      evidenceQuality: "NONE",
    },
  });

  if (await markExperimentFromProductionTraffic(prisma, experiment)) {
    return;
  }

  const traces = await prisma.trace.findMany({
    where: {
      projectId: experiment.projectId,
      name: experiment.taskName,
      provider: experiment.baselineProvider,
      model: experiment.baselineModel,
      status: "SUCCESS",
    },
    include: {
      evaluations: {
        where: { status: "COMPLETED" },
        include: { scores: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: economics.maxReplaysPerExperiment,
  });

  if (traces.length < 5) {
    await prisma.shadowExperiment.update({
      where: { id: experiment.id },
      data: {
        status: "FAILED",
        reason: "Not enough baseline traces to run a background verification.",
        completedAt: new Date(),
      },
    });
    return;
  }

  const allowSimulate = !isCrossProvider;
  const usedSimulate = allowSimulate && replayMode === "simulate";

  let passedRuns = 0;
  let borderlineRuns = 0;
  let failedRuns = 0;
  let criticalFailures = 0;
  const semanticTotals: number[] = [];
  const hallucinationTotals: number[] = [];
  const evidenceQualities: EvidenceQuality[] = [];
  let stoppedEarly = false;

  for (const trace of traces) {
    if (
      failedRuns >= economics.earlyStopFailures &&
      passedRuns === 0 &&
      borderlineRuns === 0
    ) {
      stoppedEarly = true;
      break;
    }

    const baselineResponse = trace.response ?? "";
    const candidateResponse = await replayCandidatePrompt(
      trace.prompt,
      experiment.candidateProvider,
      experiment.candidateModel,
      baselineResponse,
      candidateApiKey,
      { allowSimulate },
    );

    if (!candidateResponse) {
      failedRuns += 1;
      criticalFailures += 1;
      continue;
    }

    const {
      semantic: semanticScore,
      hallucination: hallucinationScore,
      evidenceQuality,
    } = await scoreShadowReplayRun(trace, baselineResponse, candidateResponse, {
      isCrossProvider,
      usedSimulate,
    });
    const explanation = classifyReplayRun({
      semanticScore,
      hallucinationScore,
      qualityThreshold: experiment.qualityThreshold,
      riskLevel: "MEDIUM",
    });

    if (explanation.verdict === "pass") {
      passedRuns += 1;
    } else if (explanation.verdict === "borderline") {
      borderlineRuns += 1;
    } else {
      failedRuns += 1;
    }
    if (explanation.critical) {
      criticalFailures += 1;
    }

    semanticTotals.push(semanticScore);
    hallucinationTotals.push(hallucinationScore);
    evidenceQualities.push(evidenceQuality);

    await prisma.shadowExperimentRun.create({
      data: {
        experimentId: experiment.id,
        traceId: trace.id,
        baselineResponse,
        candidateResponse,
        semanticScore,
        hallucinationScore,
        passed: explanation.verdict === "pass",
        evidenceQuality,
      },
    });
  }

  const completion = evaluateShadowExperimentCompletion(
    passedRuns,
    borderlineRuns,
    failedRuns,
    criticalFailures,
    economics.maxReplaysPerExperiment,
  );
  const scopeLabel = isCrossProvider ? "cross-provider" : "same-provider";
  const evidenceQuality: EvidenceQuality = usedSimulate
    ? "DEMO"
    : evidenceQualities.length > 0 &&
        evidenceQualities.every((quality) => quality === "JUDGED")
      ? "JUDGED"
      : "HEURISTIC";

  await prisma.shadowExperiment.update({
    where: { id: experiment.id },
    data: {
      status: completion.experimentPassed ? "PASSED" : "FAILED",
      verificationMethod: usedSimulate ? "SIMULATION" : "LIVE_REPLAY",
      evidenceQuality,
      passedRuns,
      borderlineRuns,
      failedRuns,
      criticalFailures,
      averageCandidateSemantic:
        semanticTotals.length === 0
          ? null
          : Number(
              (
                semanticTotals.reduce((sum, score) => sum + score, 0) /
                semanticTotals.length
              ).toFixed(3),
            ),
      averageCandidateHallucination:
        hallucinationTotals.length === 0
          ? null
          : Number(
              (
                hallucinationTotals.reduce((sum, score) => sum + score, 0) /
                hallucinationTotals.length
              ).toFixed(3),
            ),
      reason: usedSimulate
        ? "Simulation complete for workflow demonstration only; no candidate model was called and this is not switch verification."
        : evidenceQuality === "HEURISTIC"
          ? "Live replay completed, but only heuristic scoring was available; enable the LLM judge before treating this as switch verification."
          : completion.experimentPassed
            ? `Shadow-tested on your traffic (${scopeLabel}) with judged evidence. ${passedRuns}/${passedRuns + borderlineRuns + failedRuns} strict passes.`
            : stoppedEarly
              ? `Stopped early after ${failedRuns + borderlineRuns} weak replays without enough passes.`
              : "Shadow verification did not meet the quality bar on sampled prompts.",
      completedAt: new Date(),
    },
  });
}
