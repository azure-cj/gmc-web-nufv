import type { PrismaClient } from "@prisma/client";
import { buildCertificateTitlePrefixLine } from "@/templates/gmc-certificate-template";

export async function getStaffRequestDetail(
  db: PrismaClient,
  requestId: string,
) {
  return db.gmcRequest.findUnique({
    where: { id: requestId },
    include: {
      student: true,
      reviewedBy: true,
      certificate: true,
      auditLogs: {
        orderBy: { timestamp: "asc" },
        include: { actor: true },
      },
    },
  });
}

export interface StaffRequestReadOnlyDetail {
  requestReferenceNumber: string;
  status: string;
  dateSubmitted: string;
  dateReleased: string | null;
  studentFullName: string;
  studentId: string;
  studentCourseProgram: string;
  studentAcademicYear: string;
  term: string;
  purposeOfRequest: string;
  purposeOfCertificate: string;
  officialReceiptNumber: string | null;
  certificateNumber: string | null;
  authorizedSignatory: string | null;
  officeDesignation: string | null;
  hasViolationRecord: boolean;
  violationWording: string;
  generatedPdfUrl: string | null;
}

function studentFullName(
  firstName: string,
  middleInitial: string | null,
  lastName: string,
): string {
  return [firstName, middleInitial ? `${middleInitial}.` : null, lastName]
    .filter(Boolean)
    .join(" ");
}

export function buildStaffRequestReadOnlyDetail(
  request: Awaited<ReturnType<typeof getStaffRequestDetail>>,
): StaffRequestReadOnlyDetail | null {
  if (!request) {
    return null;
  }

  const titlePrefix = buildCertificateTitlePrefixLine(
    request.studentTitlePrefix,
    studentFullName(
      request.studentFirstName,
      request.studentMiddleInitial,
      request.studentLastName,
    ),
  );

  const violationWording = request.hasViolationRecord
    ? `It is further certified that ${titlePrefix} has a derogatory record and/or has been subjected to disciplinary action while a student at university.`
    : `It is further certified that ${titlePrefix} is of good moral character and has no derogatory records while a student at the University.`;

  return {
    requestReferenceNumber: request.requestReferenceNumber,
    status: request.status,
    dateSubmitted: request.dateSubmitted.toISOString(),
    dateReleased: request.dateReleased?.toISOString() ?? null,
    studentFullName: studentFullName(
      request.studentFirstName,
      request.studentMiddleInitial,
      request.studentLastName,
    ),
    studentId: request.studentId,
    studentCourseProgram: request.studentCourseProgram,
    studentAcademicYear: request.studentAcademicYear,
    term: request.term ?? "",
    purposeOfRequest: request.purposeOfRequest,
    purposeOfCertificate: request.certificate?.purposeOfCertificate ?? "",
    officialReceiptNumber: request.officialReceiptNumber,
    certificateNumber: request.certificate?.certificateNumber ?? null,
    authorizedSignatory: request.certificate?.authorizedSignatory ?? null,
    officeDesignation: request.certificate?.officeDesignation ?? null,
    hasViolationRecord: request.hasViolationRecord,
    violationWording,
    generatedPdfUrl: request.certificate?.generatedPdfUrl ?? null,
  };
}