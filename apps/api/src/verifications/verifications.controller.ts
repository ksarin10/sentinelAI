import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { VerificationsService } from "./verifications.service";

@Controller("projects/:projectId/verifications")
@UseGuards(JwtAuthGuard)
export class VerificationsController {
  constructor(private readonly verifications: VerificationsService) {}

  @Get()
  list(
    @CurrentUser() user: { sub: string },
    @Param("projectId") projectId: string,
    @Query("taskName") taskName?: string
  ) {
    return this.verifications.list(user.sub, projectId, taskName);
  }

  @Get(":experimentId")
  get(
    @CurrentUser() user: { sub: string },
    @Param("projectId") projectId: string,
    @Param("experimentId") experimentId: string
  ) {
    return this.verifications.get(user.sub, projectId, experimentId);
  }
}
