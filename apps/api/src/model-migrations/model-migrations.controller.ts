import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { ModelMigrationsService } from "./model-migrations.service";

@Controller("projects/:projectId/model-migrations")
@UseGuards(JwtAuthGuard)
export class ModelMigrationsController {
  constructor(private readonly modelMigrations: ModelMigrationsService) {}

  @Get()
  list(@CurrentUser() user: { sub: string }, @Param("projectId") projectId: string) {
    return this.modelMigrations.list(user.sub, projectId);
  }
}
