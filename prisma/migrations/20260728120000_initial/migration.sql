-- CreateEnum
CREATE TYPE "PurposeOfRequest" AS ENUM ('TRANSFER_OUT', 'EMPLOYMENT', 'SCHOLARSHIP', 'INTERNSHIP', 'BOARD_EXAM', 'OTHER');

CREATE TYPE "PaymentVerificationStatus" AS ENUM ('UNVERIFIED', 'VALID', 'INVALID');

CREATE TYPE "GmcRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'RETURNED', 'RELEASED');

CREATE TYPE "StaffRole" AS ENUM ('DISCIPLINE_OFFICE_STAFF', 'ADMIN');

CREATE TYPE "NumberingKind" AS ENUM ('REQUEST_REFERENCE', 'CERTIFICATE_NUMBER');

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- CreateTable
CREATE TABLE "Student" (
    "studentId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "middleInitial" TEXT,
    "lastName" TEXT NOT NULL,
    "courseProgram" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL,
    "email" TEXT NOT NULL,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("studentId")
);

-- CreateTable
CREATE TABLE "GmcRequest" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "requestReferenceNumber" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "studentFirstName" TEXT NOT NULL,
    "studentMiddleInitial" TEXT,
    "studentLastName" TEXT NOT NULL,
    "studentCourseProgram" TEXT NOT NULL,
    "studentAcademicYear" TEXT NOT NULL,
    "studentEmail" TEXT NOT NULL,
    "purposeOfRequest" "PurposeOfRequest" NOT NULL,
    "paymentProofFileUrl" TEXT NOT NULL,
    "paymentVerificationStatus" "PaymentVerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "status" "GmcRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewNotes" TEXT,
    "rejectionReason" TEXT,
    "returnReason" TEXT,
    "dateSubmitted" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateReleased" TIMESTAMP(3),
    "reviewedById" UUID,

    CONSTRAINT "GmcRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Certificate" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "gmcRequestId" UUID NOT NULL,
    "certificateNumber" TEXT NOT NULL,
    "generatedPdfUrl" TEXT,
    "dateOfIssuance" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "authorizedSignatory" TEXT NOT NULL,
    "officeDesignation" TEXT NOT NULL DEFAULT 'Discipline Office',

    CONSTRAINT "Certificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffUser" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "StaffRole" NOT NULL,

    CONSTRAINT "StaffUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLogEntry" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "gmcRequestId" UUID NOT NULL,
    "actorId" UUID,
    "action" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "AuditLogEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NumberingCounter" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "kind" "NumberingKind" NOT NULL,
    "period" TEXT NOT NULL,
    "currentSequence" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "NumberingCounter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Student_email_key" ON "Student"("email");

CREATE UNIQUE INDEX "GmcRequest_requestReferenceNumber_key" ON "GmcRequest"("requestReferenceNumber");

CREATE INDEX "GmcRequest_studentId_idx" ON "GmcRequest"("studentId");

CREATE INDEX "GmcRequest_status_idx" ON "GmcRequest"("status");

CREATE INDEX "GmcRequest_dateSubmitted_idx" ON "GmcRequest"("dateSubmitted");

CREATE UNIQUE INDEX "Certificate_gmcRequestId_key" ON "Certificate"("gmcRequestId");

CREATE UNIQUE INDEX "Certificate_certificateNumber_key" ON "Certificate"("certificateNumber");

CREATE UNIQUE INDEX "StaffUser_email_key" ON "StaffUser"("email");

CREATE INDEX "AuditLogEntry_gmcRequestId_timestamp_idx" ON "AuditLogEntry"("gmcRequestId", "timestamp");

CREATE INDEX "AuditLogEntry_actorId_idx" ON "AuditLogEntry"("actorId");

CREATE UNIQUE INDEX "NumberingCounter_kind_period_key" ON "NumberingCounter"("kind", "period");

-- AddForeignKey
ALTER TABLE "GmcRequest"
ADD CONSTRAINT "GmcRequest_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "Student"("studentId")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "GmcRequest"
ADD CONSTRAINT "GmcRequest_reviewedById_fkey"
FOREIGN KEY ("reviewedById") REFERENCES "StaffUser"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Certificate"
ADD CONSTRAINT "Certificate_gmcRequestId_fkey"
FOREIGN KEY ("gmcRequestId") REFERENCES "GmcRequest"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AuditLogEntry"
ADD CONSTRAINT "AuditLogEntry_gmcRequestId_fkey"
FOREIGN KEY ("gmcRequestId") REFERENCES "GmcRequest"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AuditLogEntry"
ADD CONSTRAINT "AuditLogEntry_actorId_fkey"
FOREIGN KEY ("actorId") REFERENCES "StaffUser"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
