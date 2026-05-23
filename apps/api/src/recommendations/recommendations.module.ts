import { Module } from "@nestjs/common";
import { AnalyticsModule } from "../analytics/analytics.module";
import { ModelCatalogModule } from "../model-catalog/model-catalog.module";
import { RecommendationsController } from "./recommendations.controller";
import { RecommendationsService } from "./recommendations.service";

@Module({
  imports: [AnalyticsModule, ModelCatalogModule],
  controllers: [RecommendationsController],
  providers: [RecommendationsService]
})
export class RecommendationsModule {}
