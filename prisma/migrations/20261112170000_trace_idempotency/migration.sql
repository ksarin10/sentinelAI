-- At-least-once ingestion can retry the same external trace. Keep one trace per
-- project while still allowing traces without an external ID.
CREATE UNIQUE INDEX "Trace_projectId_externalId_key" ON "Trace"("projectId", "externalId");

DROP INDEX IF EXISTS "Trace_externalId_idx";
