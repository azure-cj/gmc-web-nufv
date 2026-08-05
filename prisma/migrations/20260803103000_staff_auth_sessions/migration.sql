-- AlterTable
ALTER TABLE "StaffUser"
ADD COLUMN "passwordHash" TEXT;

UPDATE "StaffUser"
SET "passwordHash" = '$2b$10$6H8u0iZiadYihFsZCInIUuZALCFRbuLOoL2Xsr48tk7ENfKe6gq8C'
WHERE "email" = 'alyssa.reyes@school.edu';

UPDATE "StaffUser"
SET "passwordHash" = '$2b$10$JfezIeRYLAZY2IAGjY9FYe46RCnHs5BiS40gFdGC7kaa5Z6NHoU.W'
WHERE "email" = 'mark.dizon@school.edu';

ALTER TABLE "StaffUser"
ALTER COLUMN "passwordHash" SET NOT NULL;

-- CreateTable
CREATE TABLE "StaffSession" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "staffUserId" UUID NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "ipAddress" TEXT,
  "userAgent" TEXT,

  CONSTRAINT "StaffSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffLoginAttempt" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "email" TEXT,
  "ipAddress" TEXT,
  "success" BOOLEAN NOT NULL DEFAULT false,
  "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "StaffLoginAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StaffSession_tokenHash_key" ON "StaffSession"("tokenHash");

-- CreateIndex
CREATE INDEX "StaffSession_staffUserId_idx" ON "StaffSession"("staffUserId");

-- CreateIndex
CREATE INDEX "StaffSession_expiresAt_idx" ON "StaffSession"("expiresAt");

-- CreateIndex
CREATE INDEX "StaffLoginAttempt_email_attemptedAt_idx" ON "StaffLoginAttempt"("email", "attemptedAt");

-- CreateIndex
CREATE INDEX "StaffLoginAttempt_ipAddress_attemptedAt_idx" ON "StaffLoginAttempt"("ipAddress", "attemptedAt");

-- AddForeignKey
ALTER TABLE "StaffSession"
ADD CONSTRAINT "StaffSession_staffUserId_fkey"
FOREIGN KEY ("staffUserId") REFERENCES "StaffUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
