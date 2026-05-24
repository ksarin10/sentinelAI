import { Module } from "@nestjs/common";
import { ProjectsModule } from "../projects/projects.module";
import { TaskProfilesController } from "./task-profiles.controller";
import { TaskProfilesService } from "./task-profiles.service";

@Module({
  imports: [ProjectsModule],
  controllers: [TaskProfilesController],
  providers: [TaskProfilesService],
  exports: [TaskProfilesService]
})
export class TaskProfilesModule {}
