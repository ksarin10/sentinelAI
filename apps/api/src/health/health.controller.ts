import { Controller, Get, HttpCode, HttpStatus, Res } from "@nestjs/common";
import { Response } from "express";
import { HealthService } from "./health.service";

@Controller("health")
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async get(@Res({ passthrough: true }) response: Response) {
    const result = await this.health.check();
    if (result.status === "error") {
      response.status(HttpStatus.SERVICE_UNAVAILABLE);
    }
    return result;
  }
}
