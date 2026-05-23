import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ModelLifecycleStatus } from "@prisma/client";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { ModelCatalogService } from "./model-catalog.service";

@Controller("model-catalog")
@UseGuards(JwtAuthGuard)
export class ModelCatalogController {
  constructor(private readonly modelCatalog: ModelCatalogService) {}

  @Get()
  list(@Query("provider") provider?: string, @Query("status") status?: ModelLifecycleStatus, @Query("capability") capability?: string) {
    return this.modelCatalog.list({ provider, status, capability });
  }
}
