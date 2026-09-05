import {
  type Prisma,
  type PrismaClient,
  type PurposeOfRequest,
} from "@prisma/client";
import { formatPurposeLabel } from "@/lib/gmc-request";
import {
  buildGoodMoralCertificateHtml,
  DEFAULT_CERTIFICATE_AUTHORIZED_SIGNATORY,
  DEFAULT_CERTIFICATE_OFFICE_DESIGNATION,
} from "./certificate-template";

type DatabaseClient = PrismaClient | Prisma.TransactionClient;

export type LoadedGeneratedCertificateReviewRequest = Prisma.GmcRequestGetPayload<{
  include: {
    certificate: true;
    reviewedBy: true;
    auditLogs: {
      orderBy: {
        timestamp: "desc";
      };
      take: 5;
      include: {
        actor: true;
      };
    };
  };
}>;

export interface CertificateReviewEditableValues {
  studentFullName: string;
  studentIdNumber: string;
  courseProgram: string;
  academicYear: string;
  purposeOfCertificate: string;
  authorizedSignatory: string;
  officeDesignation: string;
}

function buildStudentFullName(request: {
  studentFirstName: string;
  studentMiddleInitial: string | null;
  studentLastName: string;
}): string {
  return [
    request.studentFirstName,
    request.studentMiddleInitial ? `${request.studentMiddleInitial}.` : null,
    request.studentLastName,
  ]
    .filter(Boolean)
    .join(" ");
}

async function buildCertificatePreviewHtml(
  certificateNumber: string,
  values: CertificateReviewEditableValues,
  dateOfIssuance: Date,
  context: {
    studentTitlePrefix: string | null;
    term: string | null;
    purposeOfRequest: PurposeOfRequest;
    officialReceiptNumber: string | null;
    hasViolationRecord: boolean;
  },
): Promise<string> {
  return await buildGoodMoralCertificateHtml({
    certificateNumber,
    studentFullName: values.studentFullName,
    studentId: values.studentIdNumber,
    courseProgram: values.courseProgram,
    term: context.term ?? "",
    academicYear: values.academicYear,
    studentTitlePrefix: context.studentTitlePrefix,
    purposeOfRequest: context.purposeOfRequest,
    officialReceiptNumber: context.officialReceiptNumber,
    hasViolationRecord: context.hasViolationRecord,
    dateOfIssuance,
    authorizedSignatory:
      values.authorizedSignatory || DEFAULT_CERTIFICATE_AUTHORIZED_SIGNATORY,
    officeDesignation:
      values.officeDesignation || DEFAULT_CERTIFICATE_OFFICE_DESIGNATION,
  });
}

export async function loadGeneratedCertificateReviewRequest(
  db: DatabaseClient,
  requestId: string,
): Promise<LoadedGeneratedCertificateReviewRequest | null> {
  return db.gmcRequest.findUnique({
    where: { id: requestId },
    include: {
      certificate: true,
      reviewedBy: true,
      auditLogs: {
        orderBy: { timestamp: "desc" },
        take: 5,
        include: { actor: true },
      },
    },
  });
}

export function buildCertificateReviewEditableValues(
  request: LoadedGeneratedCertificateReviewRequest,
): CertificateReviewEditableValues {
  const certificate = request.certificate;

  return {
    studentFullName:
      certificate?.studentFullName ?? buildStudentFullName(request),
    studentIdNumber: certificate?.studentIdNumber ?? request.studentId,
    courseProgram: certificate?.courseProgram ?? request.studentCourseProgram,
    academicYear: certificate?.academicYear ?? request.studentAcademicYear,
    purposeOfCertificate:
      certificate?.purposeOfCertificate ??
      formatPurposeLabel(request.purposeOfRequest),
    authorizedSignatory:
      certificate?.authorizedSignatory ?? DEFAULT_CERTIFICATE_AUTHORIZED_SIGNATORY,
    officeDesignation:
      certificate?.officeDesignation ?? DEFAULT_CERTIFICATE_OFFICE_DESIGNATION,
  };
}

export async function buildCertificatePreviewHtmlFromEditableValues(
  certificateNumber: string,
  values: CertificateReviewEditableValues,
  dateOfIssuance: Date,
  context: {
    studentTitlePrefix: string | null;
    term: string | null;
    purposeOfRequest: PurposeOfRequest;
    officialReceiptNumber: string | null;
    hasViolationRecord: boolean;
  },
): Promise<string> {
  return await buildCertificatePreviewHtml(certificateNumber, values, dateOfIssuance, context);
}
