import { InjectQueue } from "@nestjs/bullmq";
import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { Queue } from "bullmq";
import { randomUUID } from "crypto";
import { createApiKey } from "../common/crypto";
import { PrismaService } from "../prisma/prisma.service";
import { CreateApiKeyDto, CreateProjectDto } from "./dto";
import { ProjectsRepository } from "./projects.repository";

@Injectable()
export class ProjectsService {
  constructor(
    private readonly repository: ProjectsRepository,
    private readonly prisma: PrismaService,
    @InjectQueue("evaluations") private readonly evaluationsQueue: Queue
  ) {}

  list(ownerId: string) {
    return this.repository.list(ownerId);
  }

  async get(id: string, ownerId: string) {
    const project = await this.repository.findOwned(id, ownerId);
    if (!project) {
      throw new NotFoundException("Project not found");
    }
    return project;
  }

  create(ownerId: string, dto: CreateProjectDto) {
    return this.repository.create({
      ownerId,
      name: dto.name,
      slug: dto.slug,
      description: dto.description
    });
  }

  async createApiKey(ownerId: string, projectId: string, dto: CreateApiKeyDto) {
    await this.get(projectId, ownerId);
    const key = createApiKey();
    const record = await this.prisma.apiKey.create({
      data: { projectId, name: dto.name, keyPrefix: key.prefix, keyHash: key.hash },
      select: { id: true, name: true, keyPrefix: true, createdAt: true }
    });
    return { ...record, secret: key.secret };
  }

  async listApiKeys(ownerId: string, projectId: string) {
    await this.get(projectId, ownerId);
    return this.prisma.apiKey.findMany({
      where: { projectId, revokedAt: null },
      select: { id: true, name: true, keyPrefix: true, lastUsedAt: true, createdAt: true },
      orderBy: { createdAt: "desc" }
    });
  }

  async revokeApiKey(ownerId: string, projectId: string, keyId: string) {
    await this.get(projectId, ownerId);
    const key = await this.prisma.apiKey.findFirst({ where: { id: keyId, projectId } });
    if (!key) {
      throw new ForbiddenException("API key does not belong to this project");
    }
    return this.prisma.apiKey.update({ where: { id: keyId }, data: { revokedAt: new Date() } });
  }

  async createDemoTrace(ownerId: string, projectId: string) {
    await this.get(projectId, ownerId);
    const startedAt = new Date(Date.now() - 780);
    const endedAt = new Date();
    const scenarios = [
      {
        name: "support.answer",
        prompt: "Summarize the customer complaint and recommend the next support action.",
        response:
          "The customer reports a delayed delivery and missing tracking updates. The next action is to verify carrier status, send a proactive update, and offer a replacement or refund if the shipment is lost.",
        metadata: { environment: "demo", userId: "demo-user-42", tags: ["support", "refund"] }
      },
      {
        name: "rag.lookup",
        prompt: "Answer the user question using the provided policy context about enterprise refunds.",
        response:
          "Enterprise customers can request a refund within 30 days when the service is unavailable for more than 24 hours, according to the provided policy context.",
        metadata: { environment: "demo", userId: "demo-user-17", tags: ["rag", "policy"] }
      },
      {
        name: "sales.email",
        prompt: "Draft a concise follow-up email after a pricing demo.",
        response:
          "Thanks for joining the pricing walkthrough. Based on your team's volume and compliance requirements, SentinelAI's growth plan should cover trace retention, evaluations, and dashboard access.",
        metadata: { environment: "demo", userId: "demo-user-08", tags: ["sales", "email"] }
      }
    ];
    const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
    const promptTokens = 140 + Math.floor(Math.random() * 80);
    const completionTokens = 110 + Math.floor(Math.random() * 120);
    const trace = await this.prisma.trace.create({
      data: {
        projectId,
        externalId: `demo-${randomUUID()}`,
        name: scenario.name,
        provider: "openai",
        model: "gpt-4.1-mini",
        prompt: scenario.prompt,
        response: scenario.response,
        status: "SUCCESS",
        latencyMs: endedAt.getTime() - startedAt.getTime(),
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
        costUsd: Number(((promptTokens + completionTokens) * 0.000002).toFixed(6)),
        metadata: scenario.metadata as Prisma.InputJsonValue,
        startedAt,
        endedAt
      }
    });
    const job = await this.evaluationsQueue.add("evaluate-trace", { traceId: trace.id }, { attempts: 3, backoff: { type: "exponential", delay: 5000 } });
    return { trace, evaluationJobId: String(job.id), queued: true };
  }
}
