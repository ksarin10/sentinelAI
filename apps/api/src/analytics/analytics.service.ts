import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ProjectsService } from "../projects/projects.service";
import { TracesRepository } from "../traces/traces.repository";

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
}
