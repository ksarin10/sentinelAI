import { Body, Controller, Delete, Get, Param, Post, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { UpsertTaskProfileDto } from "./task-profile.dto";
import { TaskProfilesService } from "./task-profiles.service";

@Controller("projects/:projectId/task-profiles")
@UseGuards(JwtAuthGuard)
export class TaskProfilesController {
  constructor(private readonly taskProfiles: TaskProfilesService) {}

  @Get()
  list(@CurrentUser() user: { sub: string }, @Param("projectId") projectId: string) {
    return this.taskProfiles.list(user.sub, projectId);
  }

  @Post()
  upsert(
    @CurrentUser() user: { sub: string },
    @Param("projectId") projectId: string,
    @Body() dto: UpsertTaskProfileDto
  ) {
    return this.taskProfiles.upsert(user.sub, projectId, dto);
  }

  @Delete(":taskName")
  remove(
    @CurrentUser() user: { sub: string },
    @Param("projectId") projectId: string,
    @Param("taskName") taskName: string
  ) {
    return this.taskProfiles.remove(user.sub, projectId, decodeURIComponent(taskName));
  }
}
