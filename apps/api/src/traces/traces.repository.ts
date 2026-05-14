import { Injectable } from "@nestjs/common";
import { Prisma, TraceStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class TracesRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.TraceUncheckedCreateInput) {
    return this.prisma.trace.create({ data });
  }

  list(projectId: string) {
    return this.prisma.trace.findMany({
      where: { projectId },
      include: { evaluations: { include: { scores: true }, orderBy: { createdAt: "desc" }, take: 1 } },
      orderBy: { createdAt: "desc" },
      take: 100
    });
  }

  get(projectId: string, traceId: string) {
    return this.prisma.trace.findFirst({
      where: { id: traceId, projectId },
      include: { evaluations: { include: { scores: true }, orderBy: { createdAt: "desc" } } }
    });
  }

  summary(projectId: string) {
    return this.prisma.trace.aggregate({
      where: { projectId },
      _count: { id: true },
      _avg: { latencyMs: true },
      _sum: { totalTokens: true, costUsd: true }
    });
  }

  countByStatus(projectId: string, status: TraceStatus) {
    return this.prisma.trace.count({ where: { projectId, status } });
  }
}
