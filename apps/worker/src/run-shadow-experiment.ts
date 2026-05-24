import { PrismaClient, ShadowExperiment } from "@prisma/client";
import { evaluateShadowExperimentCompletion, evaluateShadowRun } from "./shadow-experiment-eval";
import { resolveProviderApiKey } from "./resolve-provider-api-key";
import { replayCandidatePrompt } from "./shadow-replay";
import { hallucinationRisk, semanticSimilarity } from "./scoring";

const SAMPLE_SIZE = 10;

function maxHallucinationRisk() {
  return 0.25;
}

async function markExperimentFromProductionTraffic(prisma: PrismaClient, experiment: ShadowExperiment) {
  const traces = await prisma.trace.findMany({
    where: {
      projectId: experiment.projectId,
      name: experiment.taskName,
      provider: experiment.candidateProvider,
      model: experiment.candidateModel,
      status: "SUCCESS"
    },
    include: {
      evaluations: {
        where: { status: "COMPLETED" },
        include: { scores: true }
      }
    },
    orderBy: { createdAt: "desc" },
    take: 20
  });

  if (traces.length < 5) {
    return false;
  }

  const semanticScores = traces.flatMap((trace) =>
    trace.evaluations.flatMap((evaluation) => evaluation.scores.filter((score) => score.metric === "semantic_similarity").map((score) => score.score))
  );
  const hallucinationScores = traces.flatMap((trace) =>
    trace.evaluations.flatMap((evaluation) => evaluation.scores.filter((score) => score.metric === "hallucination_risk").map((score) => score.score))
  );

  if (semanticScores.length < 5) {
    return false;
  }

  const averageSemantic = semanticScores.reduce((sum, score) => sum + score, 0) / semanticScores.length;
  const averageHallucination =
    hallucinationScores.length === 0 ? 0 : hallucinationScores.reduce((sum, score) => sum + score, 0) / hallucinationScores.length;

  if (averageSemantic < experiment.qualityThreshold || averageHallucination > maxHallucinationRisk()) {
    return false;
  }

  await prisma.shadowExperiment.update({
    where: { id: experiment.id },
    data: {
      status: "PASSED",
      passedRuns: semanticScores.length,
      failedRuns: 0,
      averageCandidateSemantic: Number(averageSemantic.toFixed(3)),
      averageCandidateHallucination: Number(averageHallucination.toFixed(3)),
      reason: "Verified using existing production traffic on the candidate model.",
      completedAt: new Date()
    }
  });

  return true;
}

export async function runShadowExperiment(prisma: PrismaClient, experimentId: string) {
  const experiment = await prisma.shadowExperiment.findUnique({ where: { id: experimentId } });
  if (!experiment || experiment.status !== "QUEUED") {
    return;
  }

  await prisma.shadowExperiment.update({
    where: { id: experiment.id },
    data: { status: "RUNNING", reason: null, passedRuns: 0, failedRuns: 0 }
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
      status: "SUCCESS"
    },
    orderBy: { createdAt: "desc" },
    take: SAMPLE_SIZE
  });

  if (traces.length < 5) {
    await prisma.shadowExperiment.update({
      where: { id: experiment.id },
      data: {
        status: "FAILED",
        reason: "Not enough baseline traces to run a background verification.",
        completedAt: new Date()
      }
    });
    return;
  }

  const candidateApiKey = await resolveProviderApiKey(prisma, experiment.projectId, experiment.candidateProvider);
  if (!candidateApiKey) {
    await prisma.shadowExperiment.update({
      where: { id: experiment.id },
      data: {
        status: "FAILED",
        reason: `No API key configured for ${experiment.candidateProvider}. Add a provider key under Project settings to run cross-provider shadow replay.`,
        completedAt: new Date()
      }
    });
    return;
  }

  let passedRuns = 0;
  let failedRuns = 0;
  const semanticTotals: number[] = [];
  const hallucinationTotals: number[] = [];

  for (const trace of traces) {
    const baselineResponse = trace.response ?? "";
    const candidateResponse = await replayCandidatePrompt(
      trace.prompt,
      experiment.candidateProvider,
      experiment.candidateModel,
      baselineResponse,
      candidateApiKey
    );

    if (!candidateResponse) {
      failedRuns += 1;
      continue;
    }

    const semanticScore = semanticSimilarity(trace.prompt, candidateResponse).score;
    const hallucinationScore = hallucinationRisk(trace.prompt, candidateResponse).score;
    const result = evaluateShadowRun(semanticScore, hallucinationScore, experiment.qualityThreshold, maxHallucinationRisk());

    if (result.passed) {
      passedRuns += 1;
    } else {
      failedRuns += 1;
    }

    semanticTotals.push(semanticScore);
    hallucinationTotals.push(hallucinationScore);

    await prisma.shadowExperimentRun.create({
      data: {
        experimentId: experiment.id,
        traceId: trace.id,
        baselineResponse,
        candidateResponse,
        semanticScore,
        hallucinationScore,
        passed: result.passed
      }
    });
  }

  const completion = evaluateShadowExperimentCompletion(passedRuns, failedRuns, SAMPLE_SIZE);
  const averageCandidateSemantic =
    semanticTotals.length === 0 ? null : Number((semanticTotals.reduce((sum, score) => sum + score, 0) / semanticTotals.length).toFixed(3));
  const averageCandidateHallucination =
    hallucinationTotals.length === 0
      ? null
      : Number((hallucinationTotals.reduce((sum, score) => sum + score, 0) / hallucinationTotals.length).toFixed(3));

  await prisma.shadowExperiment.update({
    where: { id: experiment.id },
    data: {
      status: completion.passed ? "PASSED" : "FAILED",
      passedRuns,
      failedRuns,
      averageCandidateSemantic,
      averageCandidateHallucination,
      reason: completion.passed
        ? "Background shadow verification passed on sampled traffic."
        : "Background shadow verification did not meet the quality threshold.",
      completedAt: new Date()
    }
  });
}
