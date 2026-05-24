import { Prisma, PrismaClient } from "@prisma/client";
import {
  DEFAULT_JUDGE_METRICS,
  runOpenAiJudge,
  TIER_A_JUDGE_METRICS,
  type JudgeResult
} from "@sentinelai/shared";
import { EvaluationJobData } from "./evaluation-job";
import { hallucinationRisk, semanticSimilarity } from "./scoring";

export type EvaluationScoreWrite = {
  metric: string;
  score: number;
  details: Record<string, unknown>;
};

function isJudgeEnabled() {
  return process.env.EVAL_JUDGE_ENABLED === "true" && Boolean(process.env.OPENAI_API_KEY);
}

function extractContext(metadata: unknown) {
  if (!metadata || typeof metadata !== "object") {
    return undefined;
  }
  const record = metadata as Record<string, unknown>;
  if (typeof record.context === "string") {
    return record.context;
  }
  const task = record.task;
  if (task && typeof task === "object" && typeof (task as Record<string, unknown>).context === "string") {
    return (task as Record<string, unknown>).context as string;
  }
  return undefined;
}

async function runHeuristicEvaluation(prompt: string, response: string): Promise<EvaluationScoreWrite[]> {
  const semantic = semanticSimilarity(prompt, response);
  const hallucination = hallucinationRisk(prompt, response);

  return [
    {
      metric: "semantic_similarity",
      score: semantic.score,
      details: { ...semantic.details, method: "heuristic" }
    },
    {
      metric: "hallucination_risk",
      score: hallucination.score,
      details: { ...hallucination.details, method: "heuristic" }
    }
  ];
}

function judgeResultToScores(result: JudgeResult): EvaluationScoreWrite[] {
  const { rationale, ...metrics } = result.scores;

  return Object.entries(metrics).map(([metric, score]) => ({
    metric,
    score,
    details: {
      method: result.method,
      model: result.model,
      rubricVersion: result.rubricVersion,
      rationale
    }
  }));
}

async function runJudgeEvaluation(prompt: string, response: string, context?: string) {
  const result = await runOpenAiJudge(
    {
      prompt,
      response,
      context,
      metrics: DEFAULT_JUDGE_METRICS
    },
    {
      apiKey: process.env.OPENAI_API_KEY!,
      model: process.env.EVAL_JUDGE_MODEL ?? "gpt-4.1-mini"
    }
  );

  return judgeResultToScores(result);
}

export async function scoreTraceEvaluation(
  prompt: string,
  response: string,
  metadata: unknown
): Promise<EvaluationScoreWrite[]> {
  if (!isJudgeEnabled()) {
    return runHeuristicEvaluation(prompt, response);
  }

  try {
    return await runJudgeEvaluation(prompt, response, extractContext(metadata));
  } catch (error) {
    const fallback = await runHeuristicEvaluation(prompt, response);
    const reason = error instanceof Error ? error.message : "Judge failed";
    return fallback.map((entry) => ({
      ...entry,
      details: {
        ...entry.details,
        judgeFallback: true,
        judgeError: reason
      }
    }));
  }
}

export async function runEvaluationJob(prisma: PrismaClient, data: EvaluationJobData) {
  const trace = await prisma.trace.findUnique({ where: { id: data.traceId } });
  if (!trace) {
    throw new Error(`Trace ${data.traceId} not found`);
  }

  const evaluation = await prisma.evaluation.update({
    where: { id: data.evaluationId },
    data: { status: "RUNNING", reason: null }
  });

  const scoreWrites = await scoreTraceEvaluation(trace.prompt, trace.response ?? "", trace.metadata);
  const tierAMetrics = new Set<string>(TIER_A_JUDGE_METRICS);

  if (!scoreWrites.some((entry) => tierAMetrics.has(entry.metric))) {
    const heuristic = await runHeuristicEvaluation(trace.prompt, trace.response ?? "");
    const existing = new Set(scoreWrites.map((entry) => entry.metric));
    for (const entry of heuristic) {
      if (!existing.has(entry.metric)) {
        scoreWrites.push(entry);
      }
    }
  }

  await prisma.$transaction([
    ...scoreWrites.map((entry) =>
      prisma.evaluationScore.upsert({
        where: { evaluationId_metric: { evaluationId: evaluation.id, metric: entry.metric } },
        update: { score: entry.score, details: entry.details as Prisma.InputJsonValue },
        create: {
          evaluationId: evaluation.id,
          metric: entry.metric,
          score: entry.score,
          details: entry.details as Prisma.InputJsonValue
        }
      })
    ),
    prisma.evaluation.update({ where: { id: evaluation.id }, data: { status: "COMPLETED" } })
  ]);
}
