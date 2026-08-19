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

async function loadCertificateReleaseRequest(
  db: PrismaClient,
  requestId: string,
) {
  const currentRequest = await loadGeneratedCertificateReviewRequest(db, requestId);

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

  return currentRequest;
}

export async function generateCertificatePdfForRequest(
  db: PrismaClient,
  input: ReleaseGeneratedCertificateInput,
): Promise<ReleaseGeneratedCertificateResult> {
  const currentRequest = await loadCertificateReleaseRequest(db, input.requestId);
  const certificate = currentRequest.certificate;

  if (!certificate) {
    throw new Error("This request does not have a certificate.");
  }

  try {
    const generatedPdf = await generateAndStoreCertificatePdf(currentRequest);

    await db.$transaction(async (tx) => {
      await tx.certificate.update({
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

      if (currentRequest.status === "DELIVERY_FAILED") {
        await updateGmcRequestStatusInTransaction(tx, {
          gmcRequestId: currentRequest.id,
          status: "GENERATED",
          reviewedById: input.staffUserId,
          reviewNotes: input.reviewNotes?.trim() || currentRequest.reviewNotes || null,
          actorId: input.staffUserId,
          auditAction: "REQUEST_GENERATED",
          auditNotes: `Certificate ${certificate.certificateNumber} PDF regenerated and ready for printing.`,
        });
      } else {
        await tx.auditLogEntry.create({
          data: {
            gmcRequestId: currentRequest.id,
            actorId: input.staffUserId,
            action: "CERTIFICATE_PDF_GENERATED",
            notes: `Certificate ${certificate.certificateNumber} PDF generated and ready for printing.`,
          },
        });
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to release the certificate.";
    const failureReviewNotes = [
      input.reviewNotes?.trim() || currentRequest.reviewNotes || null,
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

export async function confirmCertificatePrintedAndRelease(
  db: PrismaClient,
  input: ReleaseGeneratedCertificateInput,
): Promise<ReleaseGeneratedCertificateResult> {
  const currentRequest = await loadCertificateReleaseRequest(db, input.requestId);
  const certificate = currentRequest.certificate;

  if (!certificate) {
    throw new Error("This request does not have a certificate.");
  }

  if (!certificate.generatedPdfUrl) {
    throw new Error("The certificate PDF must be generated before it can be released.");
  }

  await db.$transaction((tx) =>
    updateGmcRequestStatusInTransaction(tx, {
      gmcRequestId: currentRequest.id,
      status: "RELEASED",
      reviewedById: input.staffUserId,
      reviewNotes: input.reviewNotes?.trim() || currentRequest.reviewNotes || null,
      dateReleased: new Date(),
      actorId: input.staffUserId,
      auditAction: "CERTIFICATE_PRINTED_AND_RELEASED",
      auditNotes: `Certificate ${certificate.certificateNumber} printed and released. PDF remains available for download; email not enabled.`,
    }),
  );

  const refreshed = await loadGeneratedCertificateReviewRequest(db, input.requestId);

  if (!refreshed) {
    throw new Error("Unable to reload the certificate after release.");
  }

  return {
    draft: buildCertificateReviewDraft(refreshed),
  };
}
