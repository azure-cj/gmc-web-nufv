-- Adopt schema evolutions previously applied to the live database via
-- direct schema sync (db push) into migration history as a baseline.
-- The live database already contains these objects; this migration exists
-- so local migration history matches the actual schema.

-- DropIndex
DROP INDEX "Student_email_key";

-- AlterTable
ALTER TABLE "AuditLogEntry" ALTER COLUMN "gmcRequestId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "GmcRequest" ADD COLUMN     "accuracyCertified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "accuracyCertifiedAt" TIMESTAMP(3),
ALTER COLUMN "paymentProofFileUrl" DROP NOT NULL;

-- AlterTable
ALTER TABLE "StaffLoginAttempt" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "StaffSession" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "StaffUser" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "mustChangePassword" BOOLEAN NOT NULL DEFAULT true;