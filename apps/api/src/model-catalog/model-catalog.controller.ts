import { Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { ModelLifecycleStatus } from "@prisma/client";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { ModelCatalogPublicGuard } from "./model-catalog-public.guard";
import { ModelCatalogService } from "./model-catalog.service";

@Controller("model-catalog")
@UseGuards(JwtAuthGuard, ModelCatalogPublicGuard)
export class ModelCatalogController {
  constructor(private readonly modelCatalog: ModelCatalogService) {}

  @Get()
  list(@Query("provider") provider?: string, @Query("status") status?: ModelLifecycleStatus, @Query("capability") capability?: string) {
    return this.modelCatalog.list({ provider, status, capability });
  }

  @Post("sync")
  sync() {
    return this.modelCatalog.syncFromCuratedCatalog();
  }
}
