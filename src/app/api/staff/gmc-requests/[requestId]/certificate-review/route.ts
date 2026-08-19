import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { consoleEmailService } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { loadValidatedStaffSessionFromRequest } from "@/lib/staff-session";
import {
  buildCertificatePreviewHtmlFromEditableValues,
  buildCertificateReviewDraft,
  loadGeneratedCertificateReviewRequest,
} from "@/server/services/certificate-review-service";
import { generateCertificatePdfForRequest } from "@/server/services/certificate-release-service";
import { updateGmcRequestStatusInTransaction } from "@/server/services/gmc-request-service";

export const runtime = "nodejs";

type CertificateReviewAction = "EDIT" | "GENERATE" | "REJECT";

const CERTIFICATE_REVIEW_ACTIONS = new Set<CertificateReviewAction>([
  "EDIT",
  "GENERATE",
  "REJECT",
]);

const CERTIFICATE_PURPOSE_OPTIONS = new Set([
  "Transfer Out",
  "Employment",
  "Scholarship",
  "Internship",
  "Board Exam",
  "Other",
]);

const STUDENT_ID_PATTERN = /^\d{4}-\d{6}$/;

interface CertificateReviewRequestBody {
  action?: unknown;
  confirmed?: unknown;
  reviewNotes?: unknown;
  rejectionReason?: unknown;
  studentFullName?: unknown;
  studentIdNumber?: unknown;
  courseProgram?: unknown;
  academicYear?: unknown;
  purposeOfCertificate?: unknown;
  authorizedSignatory?: unknown;
  officeDesignation?: unknown;
}

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function validationError(
  fieldErrors: Record<string, string>,
  message = "Please correct the highlighted fields.",
): NextResponse {
  return NextResponse.json(
    {
      fieldErrors,
      formError: message,
    },
    { status: 400 },
  );
}

function handleRouteError(error: unknown): NextResponse {
  if (
    error &&
    typeof error === "object" &&
    "fieldErrors" in error &&
    typeof (error as { fieldErrors?: unknown }).fieldErrors === "object"
  ) {
    return validationError(
      (error as { fieldErrors: Record<string, string> }).fieldErrors,
      "Please correct the highlighted fields.",
    );
  }

  const message = error instanceof Error ? error.message : "Unable to update the certificate.";

  if (message.includes("not found")) {
    return NextResponse.json(
      { formError: "The selected certificate could not be found." },
      { status: 404 },
    );
  }

  if (
    message.includes("Only generated certificates") ||
    message.includes("Only generated or delivery-failed certificates")
  ) {
    return NextResponse.json(
      {
        formError:
          "Only generated or delivery-failed certificates can be edited, approved, or rejected from this screen.",
      },
      { status: 400 },
    );
  }

  if (message.includes("No certificate is attached")) {
    return NextResponse.json(
      { formError: "This request does not yet have a generated certificate." },
      { status: 400 },
    );
  }

  return NextResponse.json(
    {
      formError:
        "Unable to complete the certificate review right now. Please try again in a moment.",
    },
    { status: 500 },
  );
}

export async function POST(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      requestId: string;
    }>;
  },
) {
  const session = await loadValidatedStaffSessionFromRequest(prisma, request);

  if (!session) {
    return NextResponse.json(
      { formError: "Your staff session has expired. Please sign in again." },
      { status: 401 },
    );
  }

  const { requestId } = await params;
  const body = (await request.json().catch(() => null)) as CertificateReviewRequestBody | null;

  if (!body) {
    return validationError({}, "Submit a valid review payload.");
  }

  const action = asText(body.action).toUpperCase() as CertificateReviewAction;
  const reviewNotes = asText(body.reviewNotes);
  const rejectionReason = asText(body.rejectionReason);
  const fieldErrors: Record<string, string> = {};

  if (!CERTIFICATE_REVIEW_ACTIONS.has(action)) {
    fieldErrors.action = "Choose a certificate review action.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return validationError(fieldErrors);
  }

  if (action === "GENERATE") {
    if (body.confirmed !== true) {
      fieldErrors.confirmation = "Confirm the certificate before generating and releasing the PDF.";
    }

    if (Object.keys(fieldErrors).length > 0) {
      return validationError(fieldErrors);
    }

    try {
      const result = await generateCertificatePdfForRequest(prisma, {
        requestId,
        staffUserId: session.staffUser.id,
        reviewNotes,
      });

      return NextResponse.json({ draft: result.draft });
    } catch (error) {
      return handleRouteError(error);
    }
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const currentRequest = await loadGeneratedCertificateReviewRequest(tx, requestId);

      if (!currentRequest) {
        throw new Error("Certificate review request not found.");
      }

      if (!currentRequest.certificate) {
        throw new Error("No certificate is attached to this request.");
      }

      if (
        currentRequest.status !== "GENERATED" &&
        currentRequest.status !== "DELIVERY_FAILED"
      ) {
        throw new Error("Only generated or delivery-failed certificates can be reviewed.");
      }

      const currentCertificate = currentRequest.certificate;

      if (action === "EDIT") {
        const studentFullName = asText(body.studentFullName);
        const studentIdNumber = asText(body.studentIdNumber);
        const courseProgram = asText(body.courseProgram);
        const academicYear = asText(body.academicYear);
        const purposeOfCertificate = asText(body.purposeOfCertificate);
        const authorizedSignatory = asText(body.authorizedSignatory);
        const officeDesignation = asText(body.officeDesignation);

        if (!studentFullName) {
          fieldErrors.studentFullName = "Student full name is required.";
        }

        if (!studentIdNumber) {
          fieldErrors.studentIdNumber = "Student ID number is required.";
        } else if (!STUDENT_ID_PATTERN.test(studentIdNumber)) {
          fieldErrors.studentIdNumber = "Use the institutional ID format 2021-123456.";
        }

        if (!courseProgram) {
          fieldErrors.courseProgram = "Course / program is required.";
        }

        if (!academicYear) {
          fieldErrors.academicYear = "Academic year is required.";
        }

        if (!purposeOfCertificate) {
          fieldErrors.purposeOfCertificate = "Purpose of certificate is required.";
        } else if (!CERTIFICATE_PURPOSE_OPTIONS.has(purposeOfCertificate)) {
          fieldErrors.purposeOfCertificate = "Select a valid purpose of certificate.";
        }

        if (!authorizedSignatory) {
          fieldErrors.authorizedSignatory = "Authorized signatory is required.";
        }

        if (!officeDesignation) {
          fieldErrors.officeDesignation = "Office designation is required.";
        }

        if (Object.keys(fieldErrors).length > 0) {
          throw Object.assign(new Error("Certificate review validation failed."), {
            fieldErrors,
            statusCode: 400,
          });
        }

        const normalizedReviewNotes = reviewNotes || null;
        const previewHtml = buildCertificatePreviewHtmlFromEditableValues(
          currentCertificate.certificateNumber,
          {
            studentFullName,
            studentIdNumber,
            courseProgram,
            academicYear,
            purposeOfCertificate,
            authorizedSignatory,
            officeDesignation,
          },
          currentCertificate.dateOfIssuance,
          {
            studentTitlePrefix: currentRequest.studentTitlePrefix ?? null,
            term: currentRequest.term ?? null,
            purposeOfRequest: currentRequest.purposeOfRequest,
            officialReceiptNumber: currentRequest.officialReceiptNumber ?? null,
          },
        );

        await tx.certificate.update({
          where: { id: currentCertificate.id },
          data: {
            studentFullName,
            studentIdNumber,
            courseProgram,
            academicYear,
            purposeOfCertificate,
            authorizedSignatory,
            officeDesignation,
            previewHtml,
          },
        });

        await tx.gmcRequest.update({
          where: { id: currentRequest.id },
          data: {
            reviewNotes: normalizedReviewNotes,
          },
        });

        await tx.auditLogEntry.create({
          data: {
            gmcRequestId: currentRequest.id,
            actorId: session.staffUser.id,
            action: "CERTIFICATE_EDITED_BEFORE_APPROVAL",
            notes: normalizedReviewNotes ?? "Certificate fields updated before approval.",
          },
        });

        const refreshed = await loadGeneratedCertificateReviewRequest(tx, requestId);

        if (!refreshed) {
          throw new Error("Unable to reload the certificate after editing.");
        }

        return buildCertificateReviewDraft(refreshed);
      }

      if (!rejectionReason) {
        fieldErrors.rejectionReason = "A rejection reason is required.";
      }

      if (Object.keys(fieldErrors).length > 0) {
        throw Object.assign(new Error("Certificate review validation failed."), {
          fieldErrors,
          statusCode: 400,
        });
      }

      const normalizedReviewNotes = reviewNotes || null;

      await tx.gmcRequest.update({
        where: { id: currentRequest.id },
        data: {
          reviewNotes: normalizedReviewNotes,
        },
      });

      await updateGmcRequestStatusInTransaction(tx, {
        gmcRequestId: currentRequest.id,
        status: "REJECTED",
        reviewedById: session.staffUser.id,
        rejectionReason,
        reviewNotes: normalizedReviewNotes,
        actorId: session.staffUser.id,
        auditNotes: rejectionReason,
      });

      const refreshed = await loadGeneratedCertificateReviewRequest(tx, requestId);

      if (!refreshed) {
        throw new Error("Unable to reload the certificate after rejection.");
      }

      return buildCertificateReviewDraft(refreshed);
    });

    if (action === "REJECT") {
      try {
        await consoleEmailService.send({
          to: result.request.studentEmail,
          subject: `GMC request ${result.request.requestReferenceNumber} was rejected`,
          text: [
            `Your Good Moral Certificate request ${result.request.requestReferenceNumber} was rejected.`,
            "",
            `Reason: ${rejectionReason}`,
          ].join("\n"),
        });
      } catch (error) {
        console.error("Certificate rejection notification failed:", error);
      }
    }

    return NextResponse.json({ draft: result });
  } catch (error) {
    return handleRouteError(error);
  }
}
