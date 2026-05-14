import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { sha256 } from "../crypto";

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const header = request.headers["x-sentinel-api-key"] ?? request.headers.authorization?.replace("Bearer ", "");
    if (!header || typeof header !== "string") {
      throw new UnauthorizedException("Missing API key");
    }

    const key = await this.prisma.apiKey.findFirst({
      where: { keyHash: sha256(header), revokedAt: null },
      include: { project: true }
    });
    if (!key) {
      throw new UnauthorizedException("Invalid API key");
    }

    await this.prisma.apiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } });
    request.project = key.project;
    return true;
  }
}
