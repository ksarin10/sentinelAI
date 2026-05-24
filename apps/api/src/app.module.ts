import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { AnalyticsModule } from "./analytics/analytics.module";
import { AuthModule } from "./auth/auth.module";
import { EvaluationsModule } from "./evaluations/evaluations.module";
import { HealthModule } from "./health/health.module";
import { IngestModule } from "./ingest/ingest.module";
import { ModelCatalogModule } from "./model-catalog/model-catalog.module";
import { ModelMigrationsModule } from "./model-migrations/model-migrations.module";
import { PrismaModule } from "./prisma/prisma.module";
import { ProviderCredentialsModule } from "./provider-credentials/provider-credentials.module";
import { ProjectsModule } from "./projects/projects.module";
import { RecommendationsModule } from "./recommendations/recommendations.module";
import { TaskProfilesModule } from "./task-profiles/task-profiles.module";
import { TracesModule } from "./traces/traces.module";
import { UsersModule } from "./users/users.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: { url: config.get<string>("REDIS_URL", "redis://localhost:6379") }
      })
    }),
    BullModule.registerQueue({ name: "evaluations" }),
    BullModule.registerQueue({ name: "shadow-experiments" }),
    PrismaModule,
    HealthModule,
    UsersModule,
    AuthModule,
    ProjectsModule,
    ProviderCredentialsModule,
    TracesModule,
    IngestModule,
    EvaluationsModule,
    ModelCatalogModule,
    ModelMigrationsModule,
    AnalyticsModule,
    RecommendationsModule,
    TaskProfilesModule
  ]
})
export class AppModule {}
