import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { ProjectsService } from "../projects/projects.service";
import { TracesRepository } from "../traces/traces.repository";
import { mapTaskModelAnalyticsRow, TaskModelAnalyticsRow } from "./task-model-analytics";

type TaskModelFilters = {
  from?: string;
  to?: string;
  taskName?: string;
  provider?: string;
  model?: string;
};

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly projects: ProjectsService,
    private readonly traces: TracesRepository,
    private readonly prisma: PrismaService
  ) {}

  async summary(ownerId: string, projectId: string) {
    await this.projects.get(projectId, ownerId);
    const [aggregate, errorCount] = await Promise.all([this.traces.summary(projectId), this.traces.countByStatus(projectId, "ERROR")]);
    const traceCount = aggregate._count.id;
    return {
      traceCount,
      averageLatencyMs: Math.round(aggregate._avg.latencyMs ?? 0),
      totalTokens: aggregate._sum.totalTokens ?? 0,
      totalCostUsd: Number(aggregate._sum.costUsd ?? 0),
      errorRate: traceCount === 0 ? 0 : errorCount / traceCount
    };
  }

  async timeseries(ownerId: string, projectId: string) {
    await this.projects.get(projectId, ownerId);
    const rows = await this.prisma.$queryRaw<Array<{ date: Date; traces: bigint; latencyMs: number; tokens: bigint; costUsd: string }>>`
      SELECT
        date_trunc('day', "createdAt") AS date,
        count(*) AS traces,
        avg("latencyMs") AS "latencyMs",
        sum("totalTokens") AS tokens,
        sum("costUsd") AS "costUsd"
      FROM "Trace"
      WHERE "projectId" = ${projectId}
      GROUP BY 1
      ORDER BY 1 ASC
      LIMIT 30
    `;
    return rows.map((row) => ({
      date: row.date.toISOString().slice(0, 10),
      traces: Number(row.traces),
      latencyMs: Math.round(Number(row.latencyMs ?? 0)),
      tokens: Number(row.tokens ?? 0),
      costUsd: Number(row.costUsd ?? 0)
    }));
  }

  async taskModels(ownerId: string, projectId: string, filters: TaskModelFilters = {}) {
    await this.projects.get(projectId, ownerId);
    const traceConditions = this.taskModelConditions(projectId, filters);
    const scoreConditions = this.taskModelConditions(projectId, filters, "t");

    const rows = await this.prisma.$queryRaw<TaskModelAnalyticsRow[]>`
      WITH trace_groups AS (
        SELECT
          "name" AS "taskName",
          "provider",
          "model",
          count(*) AS "traceCount",
          avg("latencyMs") AS "averageLatencyMs",
          sum("totalTokens") AS "totalTokens",
          sum("costUsd") AS "totalCostUsd",
          avg(CASE WHEN "status" = 'ERROR' THEN 1.0 ELSE 0.0 END) AS "errorRate"
        FROM "Trace"
        WHERE ${Prisma.join(traceConditions, " AND ")}
        GROUP BY "name", "provider", "model"
      ),
      score_groups AS (
        SELECT
          t."name" AS "taskName",
          t."provider",
          t."model",
          avg(CASE WHEN s."metric" = 'semantic_similarity' THEN s."score" END) AS "averageSemanticSimilarity",
          avg(CASE WHEN s."metric" = 'hallucination_risk' THEN s."score" END) AS "averageHallucinationRisk"
        FROM "Trace" t
        LEFT JOIN "Evaluation" e ON e."traceId" = t."id"
        LEFT JOIN "EvaluationScore" s ON s."evaluationId" = e."id"
        WHERE ${Prisma.join(scoreConditions, " AND ")}
        GROUP BY t."name", t."provider", t."model"
      )
      SELECT
        tg."taskName",
        tg."provider",
        tg."model",
        tg."traceCount",
        tg."averageLatencyMs",
        tg."totalTokens",
        tg."totalCostUsd",
        tg."errorRate",
        sg."averageSemanticSimilarity",
        sg."averageHallucinationRisk"
      FROM trace_groups tg
      LEFT JOIN score_groups sg
        ON sg."taskName" = tg."taskName"
        AND sg."provider" = tg."provider"
        AND sg."model" = tg."model"
      ORDER BY tg."totalCostUsd" DESC, tg."traceCount" DESC
      LIMIT 100
    `;

    return rows.map(mapTaskModelAnalyticsRow);
  }

  private taskModelConditions(projectId: string, filters: TaskModelFilters, alias?: "t") {
    const fields = alias
      ? {
          projectId: Prisma.sql`t."projectId"`,
          createdAt: Prisma.sql`t."createdAt"`,
          name: Prisma.sql`t."name"`,
          provider: Prisma.sql`t."provider"`,
          model: Prisma.sql`t."model"`
        }
      : {
          projectId: Prisma.sql`"projectId"`,
          createdAt: Prisma.sql`"createdAt"`,
          name: Prisma.sql`"name"`,
          provider: Prisma.sql`"provider"`,
          model: Prisma.sql`"model"`
        };

    const conditions: Prisma.Sql[] = [Prisma.sql`${fields.projectId} = ${projectId}`];

    if (filters.from) {
      conditions.push(Prisma.sql`${fields.createdAt} >= ${new Date(filters.from)}`);
    }
    if (filters.to) {
      conditions.push(Prisma.sql`${fields.createdAt} <= ${new Date(filters.to)}`);
    }
    if (filters.taskName) {
      conditions.push(Prisma.sql`${fields.name} = ${filters.taskName}`);
    }
    if (filters.provider) {
      conditions.push(Prisma.sql`${fields.provider} = ${filters.provider}`);
    }
    if (filters.model) {
      conditions.push(Prisma.sql`${fields.model} = ${filters.model}`);
    }

    return conditions;
  }
}
