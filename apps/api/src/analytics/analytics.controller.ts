import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { AnalyticsService } from "./analytics.service";

@Controller("projects/:projectId/analytics")
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get("summary")
  summary(@CurrentUser() user: { sub: string }, @Param("projectId") projectId: string) {
    return this.analytics.summary(user.sub, projectId);
  }

  @Get("timeseries")
  timeseries(@CurrentUser() user: { sub: string }, @Param("projectId") projectId: string) {
    return this.analytics.timeseries(user.sub, projectId);
  }
}
