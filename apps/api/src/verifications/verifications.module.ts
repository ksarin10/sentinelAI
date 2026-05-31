import { Module } from "@nestjs/common";
import { ProjectsModule } from "../projects/projects.module";
import { VerificationsController } from "./verifications.controller";
import { VerificationsService } from "./verifications.service";

@Module({
  imports: [ProjectsModule],
  controllers: [VerificationsController],
  providers: [VerificationsService],
  exports: [VerificationsService]
})
export class VerificationsModule {}
