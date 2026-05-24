import { Body, Controller, Delete, Get, Param, Post, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { UpsertProviderCredentialDto } from "./dto";
import { ProviderCredentialsService } from "./provider-credentials.service";

@Controller("projects/:projectId/provider-credentials")
@UseGuards(JwtAuthGuard)
export class ProviderCredentialsController {
  constructor(private readonly credentials: ProviderCredentialsService) {}

  @Get()
  list(@CurrentUser() user: { sub: string }, @Param("projectId") projectId: string) {
    return this.credentials.list(user.sub, projectId);
  }

  @Post()
  upsert(
    @CurrentUser() user: { sub: string },
    @Param("projectId") projectId: string,
    @Body() dto: UpsertProviderCredentialDto
  ) {
    return this.credentials.upsert(user.sub, projectId, dto.provider, dto.apiKey);
  }

  @Delete(":provider")
  remove(@CurrentUser() user: { sub: string }, @Param("projectId") projectId: string, @Param("provider") provider: string) {
    return this.credentials.remove(user.sub, projectId, provider);
  }
}
