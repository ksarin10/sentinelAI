import { Module } from "@nestjs/common";
import { ProjectsModule } from "../projects/projects.module";
import { ProviderCredentialsController } from "./provider-credentials.controller";
import { ProviderCredentialsService } from "./provider-credentials.service";

@Module({
  imports: [ProjectsModule],
  controllers: [ProviderCredentialsController],
  providers: [ProviderCredentialsService],
  exports: [ProviderCredentialsService]
})
export class ProviderCredentialsModule {}
