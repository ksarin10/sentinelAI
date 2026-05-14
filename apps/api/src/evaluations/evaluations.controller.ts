import { Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { EvaluationsService } from "./evaluations.service";

@Controller("projects/:projectId")
@UseGuards(JwtAuthGuard)
export class EvaluationsController {
  constructor(private readonly evaluations: EvaluationsService) {}

  @Post("traces/:traceId/evaluations")
  queue(@CurrentUser() user: { sub: string }, @Param("projectId") projectId: string, @Param("traceId") traceId: string) {
    return this.evaluations.queue(user.sub, projectId, traceId);
  }

  @Get("evaluations")
  list(@CurrentUser() user: { sub: string }, @Param("projectId") projectId: string) {
    return this.evaluations.list(user.sub, projectId);
  }

  @Get("evaluations/:evaluationId")
  get(@CurrentUser() user: { sub: string }, @Param("projectId") projectId: string, @Param("evaluationId") evaluationId: string) {
    return this.evaluations.get(user.sub, projectId, evaluationId);
  }
}
