import type { PrismaClient } from "@prisma/client";
import { getStorageService } from "@/lib/storage";
import { buildCertificatePreviewHtmlFromEditableValues, buildCertificateReviewDraft, buildCertificateReviewEditableValues, loadGeneratedCertificateReviewRequest } from "./certificate-review-service";
import { renderCertificateHtmlToPdfBuffer } from "./certificate-pdf-service";
import { updateGmcRequestStatusInTransaction } from "./gmc-request-service";

export interface ReleaseGeneratedCertificateInput {
  requestId: string;
  staffUserId: string;
  reviewNotes?: string | null;
}

export interface ReleaseGeneratedCertificateResult {
  draft: Awaited<ReturnType<typeof buildCertificateReviewDraft>>;
}

async function generateAndStoreCertificatePdf(
  request: NonNullable<
    Awaited<ReturnType<typeof loadGeneratedCertificateReviewRequest>>
  >,
): Promise<{
  generatedPdfUrl: string;
}> {
  const certificate = request.certificate;

  if (!certificate) {
    throw new Error("This request does not have a certificate.");
  }

  const editableValues = buildCertificateReviewEditableValues(request);
  const certificateHtml = buildCertificatePreviewHtmlFromEditableValues(
    certificate.certificateNumber,
    editableValues,
    certificate.dateOfIssuance,
    {
      studentTitlePrefix: request.studentTitlePrefix ?? null,
      term: request.term ?? null,
      purposeOfRequest: request.purposeOfRequest,
      officialReceiptNumber: request.officialReceiptNumber ?? null,
    },
  );
  const pdfBuffer = await renderCertificateHtmlToPdfBuffer(certificateHtml);
  const storedPdf = await getStorageService().upload({
    buffer: pdfBuffer,
    filename: `${certificate.certificateNumber}.pdf`,
    contentType: "application/pdf",
    subdirectory: "generated-certificates",
  });

  return {
    generatedPdfUrl: storedPdf.url,
  };
}

export async function releaseGeneratedCertificate(
  db: PrismaClient,
  input: ReleaseGeneratedCertificateInput,
): Promise<ReleaseGeneratedCertificateResult> {
  const currentRequest = await loadGeneratedCertificateReviewRequest(db, input.requestId);

  if (!currentRequest) {
    throw new Error("Certificate review request not found.");
  }

  if (!currentRequest.certificate) {
    throw new Error("This request does not have a certificate.");
  }

  if (
    currentRequest.status !== "GENERATED" &&
    currentRequest.status !== "DELIVERY_FAILED"
  ) {
    throw new Error("Only generated certificates can be released.");
  }

  const normalizedReviewNotes = input.reviewNotes?.trim() || currentRequest.reviewNotes || null;
  const certificate = currentRequest.certificate;
  try {
    const generatedPdf = await generateAndStoreCertificatePdf(currentRequest);

    await db.certificate.update({
      where: { id: certificate.id },
      data: {
        generatedPdfUrl: generatedPdf.generatedPdfUrl,
        previewHtml: buildCertificatePreviewHtmlFromEditableValues(
          certificate.certificateNumber,
          buildCertificateReviewEditableValues(currentRequest),
          certificate.dateOfIssuance,
          {
            studentTitlePrefix: currentRequest.studentTitlePrefix ?? null,
            term: currentRequest.term ?? null,
            purposeOfRequest: currentRequest.purposeOfRequest,
            officialReceiptNumber:
              currentRequest.officialReceiptNumber ?? null,
          },
        ),
      },
    });

    // TODO: Re-enable EmailService delivery here after production email configuration is complete.
    // The active release path intentionally performs no email or attachment preparation.

    await db.$transaction((tx) =>
      updateGmcRequestStatusInTransaction(tx, {
        gmcRequestId: currentRequest.id,
        status: "RELEASED",
        reviewedById: input.staffUserId,
        reviewNotes: normalizedReviewNotes,
        dateReleased: new Date(),
        actorId: input.staffUserId,
        auditAction: "CERTIFICATE_APPROVED_AND_RELEASED_PDF_DOWNLOAD",
        auditNotes: `Certificate ${certificate.certificateNumber} approved and released. PDF available for download; email not enabled.`,
      }),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to release the certificate.";
    const failureReviewNotes = [
      normalizedReviewNotes,
      `PDF generation failed: ${message}`,
    ]
      .filter(Boolean)
      .join("\n\n");

    await db.$transaction((tx) =>
      updateGmcRequestStatusInTransaction(tx, {
        gmcRequestId: currentRequest.id,
        status: "DELIVERY_FAILED",
        reviewedById: input.staffUserId,
        reviewNotes: failureReviewNotes,
        actorId: input.staffUserId,
        auditAction: "CERTIFICATE_DELIVERY_FAILED",
        auditNotes: message,
      }),
    );

    const refreshedFailure = await loadGeneratedCertificateReviewRequest(db, input.requestId);

    if (!refreshedFailure) {
      throw new Error("Unable to reload the certificate after delivery failure.");
    }

    return {
      draft: buildCertificateReviewDraft(refreshedFailure),
    };
  }

  const refreshed = await loadGeneratedCertificateReviewRequest(db, input.requestId);

  if (!refreshed) {
    throw new Error("Unable to reload the certificate after release.");
  }

  return {
    draft: buildCertificateReviewDraft(refreshed),
  };
}
