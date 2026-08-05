-- AlterEnum
ALTER TYPE "GmcRequestStatus" ADD VALUE IF NOT EXISTS 'GENERATED';

-- AlterTable
ALTER TABLE "Certificate"
ADD COLUMN "previewHtml" TEXT;
