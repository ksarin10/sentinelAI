import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { TracesService } from "./traces.service";

@Controller("projects/:projectId/traces")
@UseGuards(JwtAuthGuard)
export class TracesController {
  constructor(private readonly traces: TracesService) {}

  @Get()
  list(@CurrentUser() user: { sub: string }, @Param("projectId") projectId: string) {
    return this.traces.list(user.sub, projectId);
  }

  @Get(":traceId")
  get(@CurrentUser() user: { sub: string }, @Param("projectId") projectId: string, @Param("traceId") traceId: string) {
    return this.traces.get(user.sub, projectId, traceId);
  }
}
