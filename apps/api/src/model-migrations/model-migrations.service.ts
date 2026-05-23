import { Injectable } from "@nestjs/common";
import { AnalyticsService } from "../analytics/analytics.service";
import { ModelCatalogService } from "../model-catalog/model-catalog.service";
import { buildModelMigrationReports } from "./model-migration-report";

@Injectable()
export class ModelMigrationsService {
  constructor(
    private readonly analytics: AnalyticsService,
    private readonly modelCatalog: ModelCatalogService
  ) {}

  async list(ownerId: string, projectId: string) {
    const [taskModels, catalog] = await Promise.all([this.analytics.taskModels(ownerId, projectId), this.modelCatalog.list()]);

    return buildModelMigrationReports(taskModels, catalog);
  }
}
