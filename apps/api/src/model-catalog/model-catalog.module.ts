import { Module } from "@nestjs/common";
import { ModelCatalogController } from "./model-catalog.controller";
import { ModelCatalogPublicGuard } from "./model-catalog-public.guard";
import { ModelCatalogService } from "./model-catalog.service";

@Module({
  controllers: [ModelCatalogController],
  providers: [ModelCatalogService, ModelCatalogPublicGuard],
  exports: [ModelCatalogService]
})
export class ModelCatalogModule {}
