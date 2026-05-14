import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { ProjectsModule } from "../projects/projects.module";
import { EvaluationsController } from "./evaluations.controller";
import { EvaluationsService } from "./evaluations.service";

@Module({
  imports: [ProjectsModule, BullModule.registerQueue({ name: "evaluations" })],
  controllers: [EvaluationsController],
  providers: [EvaluationsService]
})
export class EvaluationsModule {}
