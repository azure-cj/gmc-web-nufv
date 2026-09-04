import {
  type Certificate,
  type Prisma,
  type PrismaClient,
} from "@prisma/client";
import { formatPurposeLabel } from "@/lib/gmc-request";
import { createCertificateNumber } from "../../lib/numbering";
import {
  buildGoodMoralCertificateHtml,
  DEFAULT_CERTIFICATE_AUTHORIZED_SIGNATORY,
  DEFAULT_CERTIFICATE_OFFICE_DESIGNATION,
} from "./certificate-template";

type DatabaseClient = PrismaClient | Prisma.TransactionClient;
type LoadedGmcRequest = Prisma.GmcRequestGetPayload<{
  include: { certificate: true };
}>;

export interface IssueCertificateInput {
  gmcRequestId: string;
  authorizedSignatory: string;
  officeDesignation?: string;
  dateOfIssuance?: Date;
  generatedPdfUrl?: string | null;
  actorId?: string | null;
}

function buildStudentFullName(request: LoadedGmcRequest): string {
  return [
    request.studentFirstName,
    request.studentMiddleInitial ? `${request.studentMiddleInitial}.` : null,
    request.studentLastName,
  ]
    .filter(Boolean)
    .join(" ");
}

async function createCertificateFromLoadedRequest(
  db: DatabaseClient,
  request: LoadedGmcRequest,
  input: IssueCertificateInput,
  dateOfIssuance: Date,
): Promise<Certificate> {
  if (request.certificate) {
    throw new Error(`GMC request ${input.gmcRequestId} already has a certificate.`);
  }

  if (request.status !== "APPROVED" && request.status !== "RELEASED") {
    throw new Error(
      `Certificates can only be issued for approved or released requests.`,
    );
  }

  const certificateNumber = await createCertificateNumber(db, dateOfIssuance);
  const studentFullName = buildStudentFullName(request);
  const studentIdNumber = request.studentId;
  const courseProgram = request.studentCourseProgram;
  const academicYear = request.studentAcademicYear;
  const authorizedSignatory =
    input.authorizedSignatory || DEFAULT_CERTIFICATE_AUTHORIZED_SIGNATORY;
  const officeDesignation =
    input.officeDesignation ?? DEFAULT_CERTIFICATE_OFFICE_DESIGNATION;
  const previewHtml = await buildGoodMoralCertificateHtml({
    certificateNumber,
    studentFullName,
    studentId: studentIdNumber,
    courseProgram,
    term: request.term ?? "",
    academicYear,
    studentTitlePrefix: request.studentTitlePrefix ?? null,
    purposeOfRequest: request.purposeOfRequest,
    officialReceiptNumber: request.officialReceiptNumber ?? null,
    hasViolationRecord: request.hasViolationRecord,
    dateOfIssuance,
    authorizedSignatory,
    officeDesignation,
  });

  const certificate = await db.certificate.create({
    data: {
      gmcRequestId: request.id,
      certificateNumber,
      studentFullName,
      studentIdNumber,
      courseProgram,
      academicYear,
      purposeOfCertificate: formatPurposeLabel(request.purposeOfRequest),
      generatedPdfUrl: input.generatedPdfUrl ?? null,
      previewHtml,
      dateOfIssuance,
      authorizedSignatory,
      officeDesignation,
    },
  });

  await db.auditLogEntry.create({
    data: {
      gmcRequestId: request.id,
      actorId: input.actorId ?? null,
      action: "CERTIFICATE_ISSUED",
      notes: `Certificate ${certificateNumber} generated.`,
    },
  });

  return certificate;
}

export async function issueCertificateForRequest(
  db: PrismaClient,
  input: IssueCertificateInput,
): Promise<Certificate> {
  const dateOfIssuance = input.dateOfIssuance ?? new Date();

  return db.$transaction(async (tx) => {
    const request = await tx.gmcRequest.findUnique({
      where: { id: input.gmcRequestId },
      include: { certificate: true },
    });

    if (!request) {
      throw new Error(`GMC request ${input.gmcRequestId} was not found.`);
    }
    return createCertificateFromLoadedRequest(tx, request, input, dateOfIssuance);
  });
}

export async function issueCertificateForLoadedRequest(
  db: DatabaseClient,
  request: LoadedGmcRequest,
  input: IssueCertificateInput,
): Promise<Certificate> {
  const dateOfIssuance = input.dateOfIssuance ?? new Date();
  return createCertificateFromLoadedRequest(db, request, input, dateOfIssuance);
}
