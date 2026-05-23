import { Module } from "@nestjs/common";
import { ProjectsModule } from "../projects/projects.module";
import { TracesModule } from "../traces/traces.module";
import { AnalyticsController } from "./analytics.controller";
import { AnalyticsService } from "./analytics.service";

@Module({
  imports: [ProjectsModule, TracesModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService]
})
export class AnalyticsModule {}
