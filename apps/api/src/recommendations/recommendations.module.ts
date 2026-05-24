import { Module } from "@nestjs/common";
import { AnalyticsModule } from "../analytics/analytics.module";
import { ModelCatalogModule } from "../model-catalog/model-catalog.module";
import { ProviderCredentialsModule } from "../provider-credentials/provider-credentials.module";
import { ShadowExperimentsModule } from "../shadow-experiments/shadow-experiments.module";
import { RecommendationsController } from "./recommendations.controller";
import { RecommendationsService } from "./recommendations.service";

@Module({
  imports: [AnalyticsModule, ModelCatalogModule, ProviderCredentialsModule, ShadowExperimentsModule],
  controllers: [RecommendationsController],
  providers: [RecommendationsService]
})
export class RecommendationsModule {}
