CREATE TYPE "EvaluationDispatchStatus" AS ENUM ('PENDING', 'DISPATCHED');

CREATE TABLE "EvaluationDispatch" (
    "id" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "status" "EvaluationDispatchStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastError" TEXT,
    "dispatchedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EvaluationDispatch_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EvaluationDispatch_evaluationId_key" ON "EvaluationDispatch"("evaluationId");
CREATE INDEX "EvaluationDispatch_status_availableAt_idx" ON "EvaluationDispatch"("status", "availableAt");

ALTER TABLE "EvaluationDispatch"
ADD CONSTRAINT "EvaluationDispatch_evaluationId_fkey"
FOREIGN KEY ("evaluationId") REFERENCES "Evaluation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Repair existing queued evaluations on rollout. The dispatcher accepts any
-- opaque text ID; this deterministic prefix keeps the migration extension-free.
INSERT INTO "EvaluationDispatch" ("id", "evaluationId", "status", "availableAt", "createdAt", "updatedAt")
SELECT CONCAT('dispatch_', MD5("id")), "id", 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Evaluation"
WHERE "status" = 'QUEUED'
ON CONFLICT ("evaluationId") DO NOTHING;
