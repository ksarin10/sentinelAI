import { Body, Controller, Delete, Get, Param, Post, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CreateApiKeyDto, CreateProjectDto } from "./dto";
import { ProjectsService } from "./projects.service";

@Controller("projects")
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Get()
  list(@CurrentUser() user: { sub: string }) {
    return this.projects.list(user.sub);
  }

  @Post()
  create(@CurrentUser() user: { sub: string }, @Body() dto: CreateProjectDto) {
    return this.projects.create(user.sub, dto);
  }

  @Get(":id")
  get(@CurrentUser() user: { sub: string }, @Param("id") id: string) {
    return this.projects.get(id, user.sub);
  }

  @Post(":id/api-keys")
  createApiKey(@CurrentUser() user: { sub: string }, @Param("id") id: string, @Body() dto: CreateApiKeyDto) {
    return this.projects.createApiKey(user.sub, id, dto);
  }

  @Get(":id/api-keys")
  listApiKeys(@CurrentUser() user: { sub: string }, @Param("id") id: string) {
    return this.projects.listApiKeys(user.sub, id);
  }

  @Delete(":id/api-keys/:keyId")
  revokeApiKey(@CurrentUser() user: { sub: string }, @Param("id") id: string, @Param("keyId") keyId: string) {
    return this.projects.revokeApiKey(user.sub, id, keyId);
  }

  @Post(":id/demo-trace")
  createDemoTrace(@CurrentUser() user: { sub: string }, @Param("id") id: string) {
    return this.projects.createDemoTrace(user.sub, id);
  }

  @Post(":id/seed-demo-analytics")
  seedDemoAnalytics(@CurrentUser() user: { sub: string }, @Param("id") id: string) {
    return this.projects.seedDemoAnalytics(user.sub, id);
  }
}
