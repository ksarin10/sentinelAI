import { Injectable } from "@nestjs/common";
import { ModelLifecycleStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { toModelCatalogDto } from "./model-catalog.dto";
import { syncModelCatalog } from "./sync-model-catalog";

export type ModelCatalogFilters = {
  provider?: string;
  status?: ModelLifecycleStatus;
  capability?: string;
};

@Injectable()
export class ModelCatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async list(filters: ModelCatalogFilters = {}) {
    const where: Prisma.ModelCatalogWhereInput = {
      provider: filters.provider,
      status: filters.status,
      capabilities: filters.capability ? { has: filters.capability } : undefined
    };

    const entries = await this.prisma.modelCatalog.findMany({
      where,
      orderBy: [{ provider: "asc" }, { model: "asc" }]
    });

    return entries.map(toModelCatalogDto);
  }

  syncFromCuratedCatalog() {
    return syncModelCatalog(this.prisma);
  }
}
