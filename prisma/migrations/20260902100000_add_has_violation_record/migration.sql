-- Add violation-record flag to GMC requests so certificate wording is stored
-- and regenerated consistently instead of being a one-time text substitution.
ALTER TABLE "GmcRequest" ADD COLUMN "hasViolationRecord" BOOLEAN NOT NULL DEFAULT false;