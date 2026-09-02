import {
  type GmcRequestStatus,
  type Prisma,
  type PrismaClient,
  type PurposeOfRequest,
} from "@prisma/client";
import { STUDENT_ID_PATTERN } from "@/lib/gmc-request";
import {
  buildCertificateReviewEditableValues,
  buildCertificatePreviewHtmlFromEditableValues,
  loadGeneratedCertificateReviewRequest,
  type LoadedGeneratedCertificateReviewRequest,
} from "./certificate-review-service";
import { issueCertificateForLoadedRequest } from "./certificate-service";
import {
  DEFAULT_CERTIFICATE_AUTHORIZED_SIGNATORY,
  DEFAULT_CERTIFICATE_OFFICE_DESIGNATION,
} from "./certificate-template";
import { updateGmcRequestStatusInTransaction } from "./gmc-request-service";

const PURPOSE_LABEL_TO_ENUM: Record<string, PurposeOfRequest> = {
  "Transfer Out": "TRANSFER_OUT",
  Employment: "EMPLOYMENT",
  Scholarship: "SCHOLARSHIP",
  Internship: "INTERNSHIP",
  "Board Exam": "BOARD_EXAM",
  Other: "OTHER",
};

const PROCESSABLE_STATUSES: ReadonlySet<GmcRequestStatus> = new Set([
  "PENDING",
  "APPROVED",
  "GENERATED",
  "DELIVERY_FAILED",
]);

export interface GmcRequestProcessDraft {
  request: {
    id: string;
    requestReferenceNumber: string;
    status: GmcRequestStatus;
    studentEmail: string;
    purposeOfRequest: PurposeOfRequest;
    term: string | null;
    officialReceiptNumber: string | null;
    hasViolationRecord: boolean;
    reviewNotes: string | null;
    dateSubmitted: string;
    dateReleased: string | null;
    reviewedByName: string | null;
    releaseDeliveryStatus: "PDF_AVAILABLE" | null;
    studentFullName: string;
    studentId: string;
    studentCourseProgram: string;
    studentAcademicYear: string;
    purposeOfCertificate: string;
  };
  invoiceNumberDuplicate: {
    exists: boolean;
    requestReferenceNumber: string | null;
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

function getReleaseDeliveryStatus(
  request: LoadedGeneratedCertificateReviewRequest,
): "PDF_AVAILABLE" | null {
  const latestReleaseAudit = request.auditLogs.find((entry) =>
    entry.action === "CERTIFICATE_APPROVED_AND_RELEASED_PDF_DOWNLOAD" ||
    entry.action === "CERTIFICATE_PRINTED_AND_RELEASED" ||
    entry.action === "CERTIFICATE_RELEASED_AND_EMAILED" ||
    entry.action === "CERTIFICATE_RELEASED_EMAIL_NOT_SENT",
  );

  return latestReleaseAudit ? "PDF_AVAILABLE" : null;
}

export function buildGmcRequestProcessDraft(
  request: LoadedGeneratedCertificateReviewRequest,
  invoiceNumberDuplicate: {
    exists: boolean;
    requestReferenceNumber: string | null;
  } = { exists: false, requestReferenceNumber: null },
): GmcRequestProcessDraft {
  const certificate = request.certificate;
  const editable = buildCertificateReviewEditableValues(request);
  const certificateNumber = certificate?.certificateNumber ?? "";
  const dateOfIssuance = certificate?.dateOfIssuance ?? request.dateSubmitted;
  const previewContext = {
    studentTitlePrefix: request.studentTitlePrefix ?? null,
    term: request.term ?? null,
    purposeOfRequest: request.purposeOfRequest,
    officialReceiptNumber: request.officialReceiptNumber ?? null,
    hasViolationRecord: request.hasViolationRecord,
  };

  return {
    request: {
      id: request.id,
      requestReferenceNumber: request.requestReferenceNumber,
      status: request.status,
      studentEmail: request.studentEmail,
      purposeOfRequest: request.purposeOfRequest,
      term: request.term ?? null,
      officialReceiptNumber: request.officialReceiptNumber ?? null,
      hasViolationRecord: request.hasViolationRecord,
      reviewNotes: request.reviewNotes ?? null,
      dateSubmitted: request.dateSubmitted.toISOString(),
      dateReleased: request.dateReleased ? request.dateReleased.toISOString() : null,
      reviewedByName: request.reviewedBy?.name ?? null,
      releaseDeliveryStatus: getReleaseDeliveryStatus(request),
      studentFullName: editable.studentFullName,
      studentId: editable.studentIdNumber,
      studentCourseProgram: editable.courseProgram,
      studentAcademicYear: editable.academicYear,
      purposeOfCertificate: editable.purposeOfCertificate,
    },
    invoiceNumberDuplicate: invoiceNumberDuplicate,
    certificate: certificate
      ? {
          id: certificate.id,
          certificateNumber,
          studentFullName: editable.studentFullName,
          studentIdNumber: editable.studentIdNumber,
          courseProgram: editable.courseProgram,
          academicYear: editable.academicYear,
          purposeOfCertificate: editable.purposeOfCertificate,
          generatedPdfUrl: certificate.generatedPdfUrl ?? null,
          previewHtml: buildCertificatePreviewHtmlFromEditableValues(
            certificateNumber,
            editable,
            dateOfIssuance,
            previewContext,
          ),
          dateOfIssuance: dateOfIssuance.toISOString(),
          authorizedSignatory: editable.authorizedSignatory,
          officeDesignation: editable.officeDesignation,
        }
      : null,
  };
}

export interface GmcRequestProcessConfirmInput {
  requestId: string;
  staffUserId: string;
  studentFullName: string;
  studentIdNumber: string;
  courseProgram: string;
  academicYear: string;
  term: string;
  purposeOfCertificate: string;
  officialReceiptNumber: string;
  hasViolationRecord: boolean;
}

export async function findDuplicateInvoiceRequest(
  db: PrismaClient | Prisma.TransactionClient,
  requestId: string,
  officialReceiptNumber: string | null,
): Promise<{ exists: boolean; requestReferenceNumber: string | null }> {
  if (!officialReceiptNumber || !officialReceiptNumber.trim()) {
    return { exists: false, requestReferenceNumber: null };
  }

  const duplicate = await db.gmcRequest.findFirst({
    where: {
      officialReceiptNumber: officialReceiptNumber.trim(),
      id: { not: requestId },
    },
    select: { requestReferenceNumber: true },
  });

  return {
    exists: Boolean(duplicate),
    requestReferenceNumber: duplicate?.requestReferenceNumber ?? null,
  };
}

function splitFullName(fullName: string): {
  firstName: string;
  middleInitial: string | null;
  lastName: string;
} {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return { firstName: "", middleInitial: null, lastName: "" };
  }

  if (parts.length === 1) {
    return { firstName: parts[0], middleInitial: null, lastName: "" };
  }

  const lastName = parts[parts.length - 1];
  const rest = parts.slice(0, -1);
  const trailingPart = rest[rest.length - 1];

  if (rest.length > 1 && /^[A-Z]\.?$/i.test(trailingPart)) {
    return {
      firstName: rest.slice(0, -1).join(" "),
      middleInitial: trailingPart.replace(".", "").toUpperCase(),
      lastName,
    };
  }

  return { firstName: rest.join(" "), middleInitial: null, lastName };
}

export async function confirmGmcRequestProcess(
  db: PrismaClient,
  input: GmcRequestProcessConfirmInput,
): Promise<GmcRequestProcessDraft> {
  return db.$transaction(async (tx) => {
    const currentRequest = await loadGeneratedCertificateReviewRequest(
      tx,
      input.requestId,
    );

    if (!currentRequest) {
      throw new Error("GMC request not found.");
    }

    if (!PROCESSABLE_STATUSES.has(currentRequest.status)) {
      throw new Error("This request can no longer be processed.");
    }

    const editableValues = {
      studentFullName: input.studentFullName.trim(),
      studentIdNumber: input.studentIdNumber.trim(),
      courseProgram: input.courseProgram.trim(),
      academicYear: input.academicYear.trim(),
      purposeOfCertificate: input.purposeOfCertificate.trim(),
      authorizedSignatory: DEFAULT_CERTIFICATE_AUTHORIZED_SIGNATORY,
      officeDesignation: DEFAULT_CERTIFICATE_OFFICE_DESIGNATION,
    };

    if (!editableValues.studentFullName) {
      throw Object.assign(new Error("Student full name is required."), {
        fieldErrors: { studentFullName: "Student full name is required." },
      });
    }

    if (!editableValues.studentIdNumber) {
      throw Object.assign(new Error("Student ID number is required."), {
        fieldErrors: { studentIdNumber: "Student ID number is required." },
      });
    }

    if (!STUDENT_ID_PATTERN.test(editableValues.studentIdNumber)) {
      throw Object.assign(
        new Error("Student ID must be in the format YEAR-NUMBER."),
        {
          fieldErrors: {
            studentIdNumber:
              "Student ID must be in the format YEAR-NUMBER (4-digit year, hyphen, then up to 10 digits).",
          },
        },
      );
    }

    if (!editableValues.courseProgram) {
      throw Object.assign(new Error("Course / program is required."), {
        fieldErrors: { courseProgram: "Course / program is required." },
      });
    }

    if (!editableValues.academicYear) {
      throw Object.assign(new Error("Academic year is required."), {
        fieldErrors: { academicYear: "Academic year is required." },
      });
    }

    if (!input.term.trim()) {
      throw Object.assign(new Error("Term is required."), {
        fieldErrors: { term: "Term is required." },
      });
    }

    if (!PURPOSE_LABEL_TO_ENUM[editableValues.purposeOfCertificate]) {
      throw Object.assign(new Error("Select a valid purpose of certificate."), {
        fieldErrors: {
          purposeOfCertificate: "Select a valid purpose of certificate.",
        },
      });
    }

    if (!input.officialReceiptNumber.trim()) {
      throw Object.assign(new Error("Official receipt number is required."), {
        fieldErrors: {
          officialReceiptNumber: "Official receipt number is required.",
        },
      });
    }

    const purposeOfRequest =
      PURPOSE_LABEL_TO_ENUM[editableValues.purposeOfCertificate];

    const nameParts = splitFullName(editableValues.studentFullName);

    let certificate = currentRequest.certificate;

    if (!certificate) {
      await updateGmcRequestStatusInTransaction(tx, {
        gmcRequestId: currentRequest.id,
        status: "APPROVED",
        reviewedById: input.staffUserId,
        reviewNotes: "Validated and approved through the guided review flow.",
        actorId: input.staffUserId,
        auditAction: "REQUEST_APPROVED",
        auditNotes: "Payment recorded and request approved during guided review.",
      });

      const approvedRequest = await loadGeneratedCertificateReviewRequest(
        tx,
        currentRequest.id,
      );

      if (!approvedRequest) {
        throw new Error("GMC request not found after approval.");
      }

      certificate = await issueCertificateForLoadedRequest(
        tx,
        approvedRequest,
        {
          gmcRequestId: currentRequest.id,
          authorizedSignatory: DEFAULT_CERTIFICATE_AUTHORIZED_SIGNATORY,
          officeDesignation: DEFAULT_CERTIFICATE_OFFICE_DESIGNATION,
          actorId: input.staffUserId,
        },
      );
    }

    await tx.certificate.update({
      where: { id: certificate.id },
      data: editableValues,
    });

    await tx.gmcRequest.update({
      where: { id: currentRequest.id },
      data: {
        studentFirstName: nameParts.firstName,
        studentMiddleInitial: nameParts.middleInitial,
        studentLastName: nameParts.lastName,
        studentCourseProgram: editableValues.courseProgram,
        studentAcademicYear: editableValues.academicYear,
        term: input.term.trim(),
        purposeOfRequest,
        officialReceiptNumber: input.officialReceiptNumber.trim(),
        hasViolationRecord: Boolean(input.hasViolationRecord),
        reviewNotes: "Information validated through the guided review flow.",
      },
    });

    await updateGmcRequestStatusInTransaction(tx, {
      gmcRequestId: currentRequest.id,
      status: "GENERATED",
      reviewedById: input.staffUserId,
      reviewNotes: "Information validated through the guided review flow.",
      actorId: input.staffUserId,
      auditAction: "REQUEST_GENERATED",
      auditNotes: "Certificate preview prepared in the guided review flow.",
    });

    const previewHtml = buildCertificatePreviewHtmlFromEditableValues(
      certificate.certificateNumber,
      editableValues,
      certificate.dateOfIssuance,
      {
        studentTitlePrefix: currentRequest.studentTitlePrefix ?? null,
        term: input.term.trim(),
        purposeOfRequest,
        officialReceiptNumber: input.officialReceiptNumber.trim(),
        hasViolationRecord: Boolean(input.hasViolationRecord),
      },
    );

    await tx.certificate.update({
      where: { id: certificate.id },
      data: { previewHtml },
    });

    await tx.auditLogEntry.create({
      data: {
        gmcRequestId: currentRequest.id,
        actorId: input.staffUserId,
        action: "CERTIFICATE_EDITED_BEFORE_APPROVAL",
        notes: "Certificate details updated during guided review.",
      },
    });

    const refreshed = await loadGeneratedCertificateReviewRequest(
      tx,
      currentRequest.id,
    );

    if (!refreshed) {
      throw new Error("Unable to reload the request after confirmation.");
    }

    const invoiceNumberDuplicate = await findDuplicateInvoiceRequest(
      tx,
      currentRequest.id,
      refreshed.officialReceiptNumber,
    );

    return buildGmcRequestProcessDraft(refreshed, invoiceNumberDuplicate);
  });
}

export interface GmcRequestProcessRejectInput {
  requestId: string;
  staffUserId: string;
  rejectionReason: string;
}

export async function rejectGmcRequestProcess(
  db: PrismaClient,
  input: GmcRequestProcessRejectInput,
): Promise<GmcRequestProcessDraft> {
  return db.$transaction(async (tx) => {
    const currentRequest = await loadGeneratedCertificateReviewRequest(
      tx,
      input.requestId,
    );

    if (!currentRequest) {
      throw new Error("GMC request not found.");
    }

    if (currentRequest.status !== "PENDING" && currentRequest.status !== "APPROVED") {
      throw Object.assign(new Error("Only pending requests can be rejected."), {
        statusCode: 400,
      });
    }

    const reason = input.rejectionReason.trim();

    if (!reason) {
      throw Object.assign(new Error("A rejection reason is required."), {
        fieldErrors: { rejectionReason: "A rejection reason is required." },
      });
    }

    await updateGmcRequestStatusInTransaction(tx, {
      gmcRequestId: currentRequest.id,
      status: "REJECTED",
      reviewedById: input.staffUserId,
      rejectionReason: reason,
      reviewNotes: reason,
      actorId: input.staffUserId,
      auditAction: "REQUEST_REJECTED",
      auditNotes: reason,
    });

    const refreshed = await loadGeneratedCertificateReviewRequest(
      tx,
      currentRequest.id,
    );

    if (!refreshed) {
      throw new Error("Unable to reload the request after rejection.");
    }

    const invoiceNumberDuplicate = await findDuplicateInvoiceRequest(
      tx,
      currentRequest.id,
      refreshed.officialReceiptNumber,
    );

    return buildGmcRequestProcessDraft(refreshed, invoiceNumberDuplicate);
  });
}