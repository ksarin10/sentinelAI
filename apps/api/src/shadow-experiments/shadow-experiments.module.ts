import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { ShadowExperimentsService } from "./shadow-experiments.service";

@Module({
  imports: [BullModule.registerQueue({ name: "shadow-experiments" })],
  providers: [ShadowExperimentsService],
  exports: [ShadowExperimentsService]
})
export class ShadowExperimentsModule {}
