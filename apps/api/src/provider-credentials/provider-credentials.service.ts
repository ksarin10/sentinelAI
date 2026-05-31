import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { decryptProviderApiKey, encryptProviderApiKey } from "@sentinelai/shared";
import { PrismaService } from "../prisma/prisma.service";
import { ProjectsRepository } from "../projects/projects.repository";

const SUPPORTED_PROVIDERS = ["openai", "anthropic", "google", "groq", "mistral", "cohere"] as const;

export type ProviderCredentialDto = {
  provider: string;
  keyHint: string;
  createdAt: string;
  updatedAt: string;
};

@Injectable()
export class ProviderCredentialsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projects: ProjectsRepository,
    private readonly config: ConfigService
  ) {}

  private encryptionSecret() {
    const candidates = [
      process.env.PROVIDER_CREDENTIALS_SECRET,
      process.env.JWT_SECRET,
      this.config.get<string>("PROVIDER_CREDENTIALS_SECRET"),
      this.config.get<string>("JWT_SECRET")
    ];
    const secret = candidates.find((value) => typeof value === "string" && value.trim().length > 0);
    if (!secret) {
      throw new Error("PROVIDER_CREDENTIALS_SECRET or JWT_SECRET is required to store provider keys");
    }
    return secret;
  }

  private async assertProjectAccess(ownerId: string, projectId: string) {
    const project = await this.projects.findOwned(projectId, ownerId);
    if (!project) {
      throw new NotFoundException("Project not found");
    }
  }

  async list(ownerId: string, projectId: string): Promise<ProviderCredentialDto[]> {
    await this.assertProjectAccess(ownerId, projectId);
    const rows = await this.prisma.projectProviderCredential.findMany({
      where: { projectId },
      orderBy: { provider: "asc" }
    });
    return rows.map((row) => ({
      provider: row.provider,
      keyHint: row.keyHint,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString()
    }));
  }

  async upsert(ownerId: string, projectId: string, provider: string, apiKey: string) {
    await this.assertProjectAccess(ownerId, projectId);
    const normalized = provider.trim().toLowerCase();
    if (!SUPPORTED_PROVIDERS.includes(normalized as (typeof SUPPORTED_PROVIDERS)[number])) {
      throw new BadRequestException(`Unsupported provider: ${provider}`);
    }
    const trimmedKey = apiKey.trim();
    if (trimmedKey.length < 8) {
      throw new BadRequestException("API key is too short");
    }

    const keyHint = `••••${trimmedKey.slice(-4)}`;
    const apiKeyCiphertext = encryptProviderApiKey(trimmedKey, this.encryptionSecret());

    const row = await this.prisma.projectProviderCredential.upsert({
      where: { projectId_provider: { projectId, provider: normalized } },
      update: { apiKeyCiphertext, keyHint },
      create: { projectId, provider: normalized, apiKeyCiphertext, keyHint }
    });

    return {
      provider: row.provider,
      keyHint: row.keyHint,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString()
    };
  }

  async remove(ownerId: string, projectId: string, provider: string) {
    await this.assertProjectAccess(ownerId, projectId);
    const normalized = provider.trim().toLowerCase();
    const row = await this.prisma.projectProviderCredential.findUnique({
      where: { projectId_provider: { projectId, provider: normalized } }
    });
    if (!row) {
      throw new NotFoundException("Provider credential not found");
    }
    await this.prisma.projectProviderCredential.delete({ where: { id: row.id } });
    return { removed: true, provider: normalized };
  }

  async configuredProviders(projectId: string) {
    const rows = await this.prisma.projectProviderCredential.findMany({
      where: { projectId },
      select: { provider: true }
    });
    return new Set(rows.map((row) => row.provider));
  }

  async resolveApiKey(projectId: string, provider: string): Promise<string | null> {
    const row = await this.prisma.projectProviderCredential.findUnique({
      where: { projectId_provider: { projectId, provider: provider.toLowerCase() } }
    });
    if (!row) {
      return null;
    }
    return decryptProviderApiKey(row.apiKeyCiphertext, this.encryptionSecret());
  }
}
