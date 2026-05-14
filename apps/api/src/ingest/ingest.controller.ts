import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { Project } from "@prisma/client";
import { CurrentProject } from "../common/decorators/current-project.decorator";
import { ApiKeyGuard } from "../common/guards/api-key.guard";
import { IngestTraceDto } from "./dto";
import { IngestService } from "./ingest.service";

@Controller("ingest")
export class IngestController {
  constructor(private readonly ingestService: IngestService) {}

  @Post("traces")
  @UseGuards(ApiKeyGuard)
  ingest(@CurrentProject() project: Project, @Body() dto: IngestTraceDto) {
    return this.ingestService.ingest(project, dto);
  }
}
