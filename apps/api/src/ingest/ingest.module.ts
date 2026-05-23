import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { TracesModule } from "../traces/traces.module";
import { IngestController } from "./ingest.controller";
import { IngestService } from "./ingest.service";

@Module({
  imports: [PrismaModule, TracesModule, BullModule.registerQueue({ name: "evaluations" })],
  controllers: [IngestController],
  providers: [IngestService]
})
export class IngestModule {}
