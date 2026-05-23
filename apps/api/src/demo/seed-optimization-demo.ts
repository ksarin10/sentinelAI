import { Prisma, PrismaClient } from "@prisma/client";

/** Keep in sync with packages/shared/src/model-catalog.ts for local demo seeding. */
const demoModelCatalog = [
  {
    provider: "openai",
    model: "gpt-4.1",
    displayName: "GPT-4.1",
    status: "ACTIVE" as const,
    inputTokenPricePer1M: 2,
    outputTokenPricePer1M: 8,
    contextWindow: 1047576,
    capabilities: ["text", "vision", "tools", "json", "reasoning"],
    catalogUpdatedAt: "2026-05-23"
  },
  {
    provider: "openai",
    model: "gpt-4.1-mini",
    displayName: "GPT-4.1 mini",
    status: "ACTIVE" as const,
    inputTokenPricePer1M: 0.4,
    outputTokenPricePer1M: 1.6,
    contextWindow: 1047576,
    capabilities: ["text", "vision", "tools", "json"],
    catalogUpdatedAt: "2026-05-23"
  },
  {
    provider: "openai",
    model: "gpt-4.1-nano",
    displayName: "GPT-4.1 nano",
    status: "ACTIVE" as const,
    inputTokenPricePer1M: 0.1,
    outputTokenPricePer1M: 0.4,
    contextWindow: 1047576,
    capabilities: ["text", "json"],
    catalogUpdatedAt: "2026-05-23"
  },
  {
    provider: "anthropic",
    model: "claude-sonnet-4.5",
    displayName: "Claude Sonnet 4.5",
    status: "RETIRING" as const,
    replacementProvider: "anthropic",
    replacementModel: "claude-sonnet-4.6",
    retirementDate: "2026-09-01",
    inputTokenPricePer1M: 3,
    outputTokenPricePer1M: 15,
    contextWindow: 200000,
    capabilities: ["text", "vision", "tools", "json", "reasoning"],
    notes: "Placeholder lifecycle entry for migration workflow demos.",
    catalogUpdatedAt: "2026-05-23"
  },
  {
    provider: "anthropic",
    model: "claude-sonnet-4.6",
    displayName: "Claude Sonnet 4.6",
    status: "ACTIVE" as const,
    inputTokenPricePer1M: 3,
    outputTokenPricePer1M: 15,
    contextWindow: 200000,
    capabilities: ["text", "vision", "tools", "json", "reasoning"],
    catalogUpdatedAt: "2026-05-23"
  }
];

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

async function seedModelCatalog(prisma: PrismaClient) {
  for (const entry of demoModelCatalog) {
    await prisma.modelCatalog.upsert({
      where: { provider_model: { provider: entry.provider, model: entry.model } },
      update: {
        displayName: entry.displayName,
        status: entry.status,
        replacementProvider: entry.replacementProvider,
        replacementModel: entry.replacementModel,
        retirementDate: entry.retirementDate ? new Date(entry.retirementDate) : null,
        inputTokenPricePer1M: entry.inputTokenPricePer1M,
        outputTokenPricePer1M: entry.outputTokenPricePer1M,
        contextWindow: entry.contextWindow,
        capabilities: entry.capabilities,
        notes: entry.notes,
        catalogUpdatedAt: new Date(entry.catalogUpdatedAt)
      },
      create: {
        provider: entry.provider,
        model: entry.model,
        displayName: entry.displayName,
        status: entry.status,
        replacementProvider: entry.replacementProvider,
        replacementModel: entry.replacementModel,
        retirementDate: entry.retirementDate ? new Date(entry.retirementDate) : null,
        inputTokenPricePer1M: entry.inputTokenPricePer1M,
        outputTokenPricePer1M: entry.outputTokenPricePer1M,
        contextWindow: entry.contextWindow,
        capabilities: entry.capabilities,
        notes: entry.notes,
        catalogUpdatedAt: new Date(entry.catalogUpdatedAt)
      }
    });
  }
}

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
  await seedModelCatalog(prisma);

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
    catalogEntries: demoModelCatalog.length,
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
