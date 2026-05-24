import { PrismaClient } from "@prisma/client";
import { decryptProviderApiKey } from "@sentinelai/shared";

function encryptionSecret() {
  const secret = process.env.PROVIDER_CREDENTIALS_SECRET ?? process.env.JWT_SECRET;
  if (!secret) {
    return null;
  }
  return secret;
}

function envFallbackKey(provider: string) {
  if (process.env.NODE_ENV === "production") {
    return null;
  }
  const map: Record<string, string | undefined> = {
    openai: process.env.OPENAI_API_KEY,
    anthropic: process.env.ANTHROPIC_API_KEY,
    google: process.env.GOOGLE_API_KEY,
    groq: process.env.GROQ_API_KEY
  };
  return map[provider] ?? null;
}

export async function resolveProviderApiKey(prisma: PrismaClient, projectId: string, provider: string) {
  const normalized = provider.toLowerCase();
  const row = await prisma.projectProviderCredential.findUnique({
    where: { projectId_provider: { projectId, provider: normalized } }
  });

  const secret = encryptionSecret();
  if (row && secret) {
    return decryptProviderApiKey(row.apiKeyCiphertext, secret);
  }

  return envFallbackKey(normalized);
}
