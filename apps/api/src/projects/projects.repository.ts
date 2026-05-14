import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ProjectsRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(ownerId: string) {
    return this.prisma.project.findMany({
      where: { ownerId },
      include: { apiKeys: { select: { id: true, name: true, keyPrefix: true, lastUsedAt: true, createdAt: true } } },
      orderBy: { createdAt: "desc" }
    });
  }

  findOwned(id: string, ownerId: string) {
    return this.prisma.project.findFirst({
      where: { id, ownerId },
      include: { apiKeys: { select: { id: true, name: true, keyPrefix: true, lastUsedAt: true, createdAt: true } } }
    });
  }

  create(data: { ownerId: string; name: string; slug: string; description?: string }) {
    return this.prisma.project.create({ data });
  }
}
