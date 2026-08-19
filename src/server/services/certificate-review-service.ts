import {
  type GmcRequestStatus,
  type PaymentVerificationStatus,
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

export interface CertificateReviewDraft {
  request: {
    id: string;
    requestReferenceNumber: string;
    status: GmcRequestStatus;
    studentEmail: string;
    purposeOfRequest: PurposeOfRequest;
    officialReceiptNumber: string | null;
    paymentVerificationStatus: PaymentVerificationStatus;
    reviewNotes: string | null;
    dateSubmitted: string;
    dateReleased: string | null;
    reviewedByName: string | null;
    releaseDeliveryStatus: "PDF_AVAILABLE" | null;
  };
  certificate: {
    id: string;
    certificateNumber: string;
    studentFullName: string;
    studentIdNumber: string;
    courseProgram: string;
    academicYear: string;
    purposeOfCertificate: string;
    generatedPdfUrl: string | null;
    previewHtml: string;
    dateOfIssuance: string;
    authorizedSignatory: string;
    officeDesignation: string;
  } | null;
}

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

function buildCertificatePreviewHtml(
  certificateNumber: string,
  values: CertificateReviewEditableValues,
  dateOfIssuance: Date,
  context: {
    studentTitlePrefix: string | null;
    term: string | null;
    purposeOfRequest: PurposeOfRequest;
    officialReceiptNumber: string | null;
  },
): string {
  return buildGoodMoralCertificateHtml({
    certificateNumber,
    studentFullName: values.studentFullName,
    studentId: values.studentIdNumber,
    courseProgram: values.courseProgram,
    term: context.term ?? "",
    academicYear: values.academicYear,
    studentTitlePrefix: context.studentTitlePrefix,
    purposeOfRequest: context.purposeOfRequest,
    officialReceiptNumber: context.officialReceiptNumber,
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

export function buildCertificateReviewDraft(
  request: LoadedGeneratedCertificateReviewRequest,
): CertificateReviewDraft {
  const certificate = request.certificate;
  const editableValues = buildCertificateReviewEditableValues(request);
  const certificateNumber = certificate?.certificateNumber ?? "";
  const dateOfIssuance = certificate?.dateOfIssuance ?? request.dateSubmitted;
  const latestReleaseAudit = request.auditLogs.find((entry) =>
    entry.action === "CERTIFICATE_APPROVED_AND_RELEASED_PDF_DOWNLOAD" ||
    entry.action === "CERTIFICATE_PRINTED_AND_RELEASED" ||
    entry.action === "CERTIFICATE_RELEASED_AND_EMAILED" ||
    entry.action === "CERTIFICATE_RELEASED_EMAIL_NOT_SENT",
  );

  return {
    request: {
      id: request.id,
      requestReferenceNumber: request.requestReferenceNumber,
      status: request.status,
      studentEmail: request.studentEmail,
      purposeOfRequest: request.purposeOfRequest,
      officialReceiptNumber: request.officialReceiptNumber ?? null,
      paymentVerificationStatus: request.paymentVerificationStatus,
      reviewNotes: request.reviewNotes ?? null,
      dateSubmitted: request.dateSubmitted.toISOString(),
      dateReleased: request.dateReleased ? request.dateReleased.toISOString() : null,
      reviewedByName: request.reviewedBy?.name ?? null,
      releaseDeliveryStatus: latestReleaseAudit ? "PDF_AVAILABLE" : null,
    },
    certificate: certificate
      ? {
          id: certificate.id,
          certificateNumber,
          studentFullName: editableValues.studentFullName,
          studentIdNumber: editableValues.studentIdNumber,
          courseProgram: editableValues.courseProgram,
          academicYear: editableValues.academicYear,
          purposeOfCertificate: editableValues.purposeOfCertificate,
          generatedPdfUrl: certificate.generatedPdfUrl ?? null,
          previewHtml: buildCertificatePreviewHtml(
            certificateNumber,
            editableValues,
            dateOfIssuance,
            {
              studentTitlePrefix: request.studentTitlePrefix ?? null,
              term: request.term ?? null,
              purposeOfRequest: request.purposeOfRequest,
              officialReceiptNumber: request.officialReceiptNumber ?? null,
            },
          ),
          dateOfIssuance: dateOfIssuance.toISOString(),
          authorizedSignatory: editableValues.authorizedSignatory,
          officeDesignation: editableValues.officeDesignation,
        }
      : null,
  };
}

export function buildCertificatePreviewHtmlFromEditableValues(
  certificateNumber: string,
  values: CertificateReviewEditableValues,
  dateOfIssuance: Date,
  context: {
    studentTitlePrefix: string | null;
    term: string | null;
    purposeOfRequest: PurposeOfRequest;
    officialReceiptNumber: string | null;
  },
): string {
  return buildCertificatePreviewHtml(certificateNumber, values, dateOfIssuance, context);
}
