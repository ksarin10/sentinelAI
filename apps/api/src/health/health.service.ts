import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import IORedis from "ioredis";
import { PrismaService } from "../prisma/prisma.service";

export type HealthStatus = "ok" | "degraded" | "error";

export type HealthCheckResponse = {
  status: HealthStatus;
  checks: {
    database: HealthStatus;
    redis: HealthStatus;
  };
  timestamp: string;
};

export function aggregateHealthStatus(checks: { database: HealthStatus; redis: HealthStatus }): HealthStatus {
  if (checks.database === "error" || checks.redis === "error") {
    return "error";
  }
  if (checks.database === "degraded" || checks.redis === "degraded") {
    return "degraded";
  }
  return "ok";
}

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService
  ) {}

  async check(): Promise<HealthCheckResponse> {
    const [database, redis] = await Promise.all([this.checkDatabase(), this.checkRedis()]);
    const checks = { database, redis };
    const status = aggregateHealthStatus(checks);

    return {
      status,
      checks,
      timestamp: new Date().toISOString()
    };
  }

  private async checkDatabase(): Promise<HealthStatus> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return "ok";
    } catch {
      return "error";
    }
  }

  private async checkRedis(): Promise<HealthStatus> {
    const redisUrl = this.config.get<string>("REDIS_URL", "redis://localhost:6379");
    const client = new IORedis(redisUrl, {
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      lazyConnect: true
    });

    try {
      await client.connect();
      const pong = await client.ping();
      return pong === "PONG" ? "ok" : "degraded";
    } catch {
      return "error";
    } finally {
      client.disconnect();
    }
  }
}
