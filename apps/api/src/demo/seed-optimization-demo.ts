import { Prisma, PrismaClient } from "@prisma/client";
import { syncModelCatalog } from "../model-catalog/sync-model-catalog";

type MockTraceSpec = {
  name: string;
  provider: string;
  model: string;
  prompt: string;
  response: string;
  promptTokens: number;
  completionTokens: number;
  costUsd: number;
  latencyMs: number;
  createdAt: Date;
  metadata?: Record<string, unknown>;
  semanticScore: number;
  hallucinationScore: number;
};

async function createMockTrace(prisma: PrismaClient, projectId: string, spec: MockTraceSpec) {
  const totalTokens = spec.promptTokens + spec.completionTokens;
  const startedAt = new Date(spec.createdAt.getTime() - spec.latencyMs);
  const trace = await prisma.trace.create({
    data: {
      projectId,
      externalId: `mock-${spec.name}-${spec.createdAt.getTime()}`,
      name: spec.name,
      provider: spec.provider,
      model: spec.model,
      prompt: spec.prompt,
      response: spec.response,
      status: "SUCCESS",
      latencyMs: spec.latencyMs,
      promptTokens: spec.promptTokens,
      completionTokens: spec.completionTokens,
      totalTokens,
      costUsd: spec.costUsd,
      metadata: {
        environment: "demo",
        source: "seed-optimization-demo",
        ...spec.metadata
      } as Prisma.InputJsonValue,
      startedAt,
      endedAt: spec.createdAt,
      createdAt: spec.createdAt
    }
  });

  const evaluation = await prisma.evaluation.create({
    data: { traceId: trace.id, status: "COMPLETED" }
  });

  await prisma.evaluationScore.createMany({
    data: [
      {
        evaluationId: evaluation.id,
        metric: "semantic_similarity",
        score: spec.semanticScore,
        details: { method: "mock_seed" }
      },
      {
        evaluationId: evaluation.id,
        metric: "hallucination_risk",
        score: spec.hallucinationScore,
        details: { method: "mock_seed" }
      }
    ]
  });

  return trace;
}

function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

export async function seedOptimizationDemo(prisma: PrismaClient, projectId: string) {
  const catalogResult = await syncModelCatalog(prisma);

  await prisma.taskProfile.upsert({
    where: { projectId_taskName: { projectId, taskName: "support.answer" } },
    update: {
      riskLevel: "MEDIUM",
      qualityThreshold: 0.8,
      optimizationGoal: "REDUCE_COST"
    },
    create: {
      projectId,
      taskName: "support.answer",
      riskLevel: "MEDIUM",
      qualityThreshold: 0.8,
      optimizationGoal: "REDUCE_COST",
      notes: "Demo task profile for cost recommendations"
    }
  });

  const expensiveSupportTraces: MockTraceSpec[] = Array.from({ length: 8 }, (_, index) => ({
    name: "support.answer",
    provider: "openai",
    model: "gpt-4.1",
    prompt: "Summarize the customer complaint and recommend the next support action.",
    response:
      "The customer reports a delayed delivery and missing tracking updates. Verify carrier status, send a proactive update, and offer a replacement or refund if the shipment is lost.",
    promptTokens: 180 + index * 3,
    completionTokens: 120 + index * 2,
    costUsd: Number((0.0012 + index * 0.00008).toFixed(6)),
    latencyMs: 900 + index * 40,
    createdAt: daysAgo(index % 5),
    semanticScore: 0.86,
    hallucinationScore: 0.08,
    metadata: { tags: ["support", "mock"], task: { version: "v1", riskLevel: "MEDIUM" } }
  }));

  const retiringModelTraces: MockTraceSpec[] = Array.from({ length: 6 }, (_, index) => ({
    name: "policy.qa",
    provider: "anthropic",
    model: "claude-sonnet-4.5",
    prompt: "Answer the refund policy question using only the provided enterprise policy context.",
    response:
      "Enterprise customers can request a refund within 30 days when the service is unavailable for more than 24 hours, according to the provided policy context.",
    promptTokens: 160 + index * 4,
    completionTokens: 95 + index * 3,
    costUsd: Number((0.0015 + index * 0.00006).toFixed(6)),
    latencyMs: 1100 + index * 35,
    createdAt: daysAgo(index % 4),
    semanticScore: 0.84,
    hallucinationScore: 0.1,
    metadata: { tags: ["policy", "mock"], task: { version: "v2", riskLevel: "HIGH" } }
  }));

  for (const spec of [...expensiveSupportTraces, ...retiringModelTraces]) {
    await createMockTrace(prisma, projectId, spec);
  }

  return {
    catalogEntries: catalogResult.synced,
    tracesCreated: expensiveSupportTraces.length + retiringModelTraces.length,
    recommendationPreview: {
      taskName: "support.answer",
      currentModel: "gpt-4.1",
      suggestedModel: "gpt-4.1-mini"
    },
    migrationPreview: {
      model: "claude-sonnet-4.5",
      replacementModel: "claude-sonnet-4.6"
    }
  };
}
