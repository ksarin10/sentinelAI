import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RecommendationsService } from "./recommendations.service";

@Controller("projects/:projectId/recommendations")
@UseGuards(JwtAuthGuard)
export class RecommendationsController {
  constructor(private readonly recommendations: RecommendationsService) {}

  @Get()
  list(@CurrentUser() user: { sub: string }, @Param("projectId") projectId: string) {
    return this.recommendations.list(user.sub, projectId);
  }
}
