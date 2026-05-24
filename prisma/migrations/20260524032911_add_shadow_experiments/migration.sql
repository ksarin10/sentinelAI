-- CreateEnum
CREATE TYPE "ShadowExperimentStatus" AS ENUM ('QUEUED', 'RUNNING', 'PASSED', 'FAILED');

-- CreateTable
CREATE TABLE "ShadowExperiment" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "taskName" TEXT NOT NULL,
    "baselineProvider" TEXT NOT NULL,
    "baselineModel" TEXT NOT NULL,
    "candidateProvider" TEXT NOT NULL,
    "candidateModel" TEXT NOT NULL,
    "status" "ShadowExperimentStatus" NOT NULL DEFAULT 'QUEUED',
    "sampleSize" INTEGER NOT NULL DEFAULT 10,
    "qualityThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0.8,
    "passedRuns" INTEGER NOT NULL DEFAULT 0,
    "failedRuns" INTEGER NOT NULL DEFAULT 0,
    "averageCandidateSemantic" DOUBLE PRECISION,
    "averageCandidateHallucination" DOUBLE PRECISION,
    "estimatedSavingsPercent" DOUBLE PRECISION,
    "reason" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShadowExperiment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShadowExperimentRun" (
    "id" TEXT NOT NULL,
    "experimentId" TEXT NOT NULL,
    "traceId" TEXT NOT NULL,
    "baselineResponse" TEXT NOT NULL,
    "candidateResponse" TEXT NOT NULL,
    "semanticScore" DOUBLE PRECISION NOT NULL,
    "hallucinationScore" DOUBLE PRECISION NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShadowExperimentRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShadowExperiment_projectId_status_idx" ON "ShadowExperiment"("projectId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ShadowExperiment_projectId_taskName_baselineProvider_baseli_key" ON "ShadowExperiment"("projectId", "taskName", "baselineProvider", "baselineModel", "candidateProvider", "candidateModel");

-- CreateIndex
CREATE INDEX "ShadowExperimentRun_experimentId_idx" ON "ShadowExperimentRun"("experimentId");

-- AddForeignKey
ALTER TABLE "ShadowExperiment" ADD CONSTRAINT "ShadowExperiment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShadowExperimentRun" ADD CONSTRAINT "ShadowExperimentRun_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "ShadowExperiment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
