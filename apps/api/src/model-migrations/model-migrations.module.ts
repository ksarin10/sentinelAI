import { Module } from "@nestjs/common";
import { AnalyticsModule } from "../analytics/analytics.module";
import { ModelCatalogModule } from "../model-catalog/model-catalog.module";
import { ModelMigrationsController } from "./model-migrations.controller";
import { ModelMigrationsService } from "./model-migrations.service";

@Module({
  imports: [AnalyticsModule, ModelCatalogModule],
  controllers: [ModelMigrationsController],
  providers: [ModelMigrationsService]
})
export class ModelMigrationsModule {}
