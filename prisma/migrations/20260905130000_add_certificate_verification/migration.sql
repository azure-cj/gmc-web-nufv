-- CreateEnum
CREATE TYPE "CertificateStatus" AS ENUM ('ACTIVE', 'VOIDED');

-- AlterTable
ALTER TABLE "Certificate" ADD COLUMN     "status" "CertificateStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "verificationToken" TEXT;

-- CreateTable
CREATE TABLE "VerificationLookup" (
    "id" UUID NOT NULL,
    "ipHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationLookup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VerificationLookup_ipHash_createdAt_idx" ON "VerificationLookup"("ipHash", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_verificationToken_key" ON "Certificate"("verificationToken");

-- CreateIndex
CREATE INDEX "Certificate_status_idx" ON "Certificate"("status");