CREATE TYPE "VerificationMethod" AS ENUM ('UNVERIFIED', 'SIMULATION', 'LIVE_REPLAY', 'PRODUCTION_TRAFFIC');
CREATE TYPE "EvidenceQuality" AS ENUM ('NONE', 'DEMO', 'HEURISTIC', 'JUDGED');

ALTER TABLE "ShadowExperiment"
ADD COLUMN "verificationMethod" "VerificationMethod" NOT NULL DEFAULT 'UNVERIFIED',
ADD COLUMN "evidenceQuality" "EvidenceQuality" NOT NULL DEFAULT 'NONE';

ALTER TABLE "ShadowExperimentRun"
ADD COLUMN "evidenceQuality" "EvidenceQuality" NOT NULL DEFAULT 'NONE';

-- Historical experiments predate evidence provenance. Keep them visible, but
-- do not treat them as genuine switch verification.
UPDATE "ShadowExperiment"
SET "reason" = CASE
  WHEN "status" = 'PASSED' THEN 'Historical result retained without evidence provenance; rerun live verification.'
  ELSE "reason"
END;
