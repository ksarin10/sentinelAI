import { Module } from "@nestjs/common";
import { ProjectsModule } from "../projects/projects.module";
import { TracesController } from "./traces.controller";
import { TracesRepository } from "./traces.repository";
import { TracesService } from "./traces.service";

@Module({
  imports: [ProjectsModule],
  controllers: [TracesController],
  providers: [TracesService, TracesRepository],
  exports: [TracesRepository]
})
export class TracesModule {}
