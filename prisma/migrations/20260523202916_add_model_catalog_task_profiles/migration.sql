-- CreateEnum
CREATE TYPE "ModelLifecycleStatus" AS ENUM ('ACTIVE', 'RETIRING', 'DEPRECATED', 'RETIRED');

-- CreateEnum
CREATE TYPE "TaskRiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "OptimizationGoal" AS ENUM ('BALANCED', 'REDUCE_COST', 'REDUCE_LATENCY', 'MAXIMIZE_QUALITY');

-- CreateTable
CREATE TABLE "ModelCatalog" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "status" "ModelLifecycleStatus" NOT NULL DEFAULT 'ACTIVE',
    "replacementProvider" TEXT,
    "replacementModel" TEXT,
    "retirementDate" TIMESTAMP(3),
    "inputTokenPricePer1M" DECIMAL(12,6) NOT NULL,
    "outputTokenPricePer1M" DECIMAL(12,6) NOT NULL,
    "contextWindow" INTEGER,
    "capabilities" TEXT[],
    "notes" TEXT,
    "catalogUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModelCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskProfile" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "taskName" TEXT NOT NULL,
    "riskLevel" "TaskRiskLevel" NOT NULL DEFAULT 'MEDIUM',
    "qualityThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0.8,
    "optimizationGoal" "OptimizationGoal" NOT NULL DEFAULT 'BALANCED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ModelCatalog_status_idx" ON "ModelCatalog"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ModelCatalog_provider_model_key" ON "ModelCatalog"("provider", "model");

-- CreateIndex
CREATE INDEX "TaskProfile_projectId_riskLevel_idx" ON "TaskProfile"("projectId", "riskLevel");

-- CreateIndex
CREATE UNIQUE INDEX "TaskProfile_projectId_taskName_key" ON "TaskProfile"("projectId", "taskName");

-- AddForeignKey
ALTER TABLE "TaskProfile" ADD CONSTRAINT "TaskProfile_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
