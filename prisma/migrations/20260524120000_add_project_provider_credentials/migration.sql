-- CreateTable
CREATE TABLE "ProjectProviderCredential" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "apiKeyCiphertext" TEXT NOT NULL,
    "keyHint" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectProviderCredential_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectProviderCredential_projectId_idx" ON "ProjectProviderCredential"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectProviderCredential_projectId_provider_key" ON "ProjectProviderCredential"("projectId", "provider");

-- AddForeignKey
ALTER TABLE "ProjectProviderCredential" ADD CONSTRAINT "ProjectProviderCredential_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
