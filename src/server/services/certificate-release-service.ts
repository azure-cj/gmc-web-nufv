import type { PrismaClient } from "@prisma/client";
import { createConfiguredEmailService, getEmailFromAddress, getReleaseContactDetails } from "@/lib/email";
import { localStorageService } from "@/lib/storage";
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
  deliveryFailed: boolean;
  deliveryError: string | null;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildEmailTextPayload(input: {
  certificateNumber: string;
  contactName: string;
  contactEmail: string | null;
  contactPhone: string | null;
}): string {
  const lines = [
    "Your Good Moral Certificate request has been processed.",
    "",
    `Certificate Number: ${input.certificateNumber}`,
    "The signed PDF is attached to this message.",
    "",
    "For follow-up queries, please contact the Discipline Office.",
  ];

  if (input.contactName) {
    lines.push(`Office: ${input.contactName}`);
  }

  if (input.contactEmail) {
    lines.push(`Email: ${input.contactEmail}`);
  }

  if (input.contactPhone) {
    lines.push(`Phone: ${input.contactPhone}`);
  }

  return lines.join("\n");
}

function buildEmailHtmlPayload(input: {
  certificateNumber: string;
  contactName: string;
  contactEmail: string | null;
  contactPhone: string | null;
}): string {
  const contactLines = [
    input.contactName
      ? `<div><strong>Office:</strong> ${escapeHtml(input.contactName)}</div>`
      : "",
    input.contactEmail
      ? `<div><strong>Email:</strong> ${escapeHtml(input.contactEmail)}</div>`
      : "",
    input.contactPhone
      ? `<div><strong>Phone:</strong> ${escapeHtml(input.contactPhone)}</div>`
      : "",
  ].join("");

  return `<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <div style="max-width:640px;margin:0 auto;padding:32px 24px;">
      <div style="border:1px solid #dbe4f0;border-radius:24px;background:#ffffff;padding:28px;">
        <div style="font-size:12px;letter-spacing:0.24em;text-transform:uppercase;color:#64748b;">Good Moral Certificate</div>
        <h1 style="margin:14px 0 12px;font-size:28px;line-height:1.15;color:#111827;">Your request has been processed</h1>
        <p style="margin:0 0 18px;font-size:16px;line-height:1.7;color:#334155;">
          The signed Good Moral Certificate PDF is attached to this email.
        </p>
        <div style="margin:0 0 22px;padding:18px 20px;border-radius:18px;background:#f8fafc;border:1px solid #e2e8f0;">
          <div style="font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#64748b;">Certificate Number</div>
          <div style="margin-top:8px;font-size:20px;font-weight:700;color:#111827;">${escapeHtml(input.certificateNumber)}</div>
        </div>
        <div style="margin-top:22px;padding:18px 20px;border-radius:18px;background:#fff7ed;border:1px solid #fdba74;">
          <div style="font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#9a3412;">Follow-up Contact</div>
          <div style="margin-top:10px;font-size:15px;line-height:1.75;color:#7c2d12;">
            ${contactLines || "<div>The Discipline Office will assist you with follow-up queries.</div>"}
          </div>
        </div>
      </div>
    </div>
  </body>
</html>`;
}

async function ensurePdfAttachmentPath(
  request: NonNullable<
    Awaited<ReturnType<typeof loadGeneratedCertificateReviewRequest>>
  >,
): Promise<{
  generatedPdfUrl: string;
  absolutePath: string;
  generatedNow: boolean;
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
      purposeOfRequest: request.purposeOfRequest,
      officialReceiptNumber: request.officialReceiptNumber ?? null,
    },
  );
  const pdfBuffer = await renderCertificateHtmlToPdfBuffer(certificateHtml);
  const storedPdf = await localStorageService.upload({
    buffer: pdfBuffer,
    filename: `${certificate.certificateNumber}.pdf`,
    contentType: "application/pdf",
    subdirectory: "generated-certificates",
  });

  return {
    generatedPdfUrl: storedPdf.url,
    absolutePath: storedPdf.absolutePath,
    generatedNow: true,
  };
}

export async function releaseGeneratedCertificate(
  db: PrismaClient,
  input: ReleaseGeneratedCertificateInput,
): Promise<ReleaseGeneratedCertificateResult> {
  const contactDetails = getReleaseContactDetails();
  const emailFrom = getEmailFromAddress();

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
    const attachment = await ensurePdfAttachmentPath(currentRequest);

    await db.certificate.update({
      where: { id: certificate.id },
      data: {
        generatedPdfUrl: attachment.generatedPdfUrl,
        previewHtml: buildCertificatePreviewHtmlFromEditableValues(
          certificate.certificateNumber,
          buildCertificateReviewEditableValues(currentRequest),
          certificate.dateOfIssuance,
          {
            studentTitlePrefix: currentRequest.studentTitlePrefix ?? null,
            purposeOfRequest: currentRequest.purposeOfRequest,
            officialReceiptNumber:
              currentRequest.officialReceiptNumber ?? null,
          },
        ),
      },
    });

    const emailService = createConfiguredEmailService();

    await emailService.send({
      from: emailFrom,
      replyTo: contactDetails.email ?? undefined,
      to: currentRequest.studentEmail,
      subject: `Good Moral Certificate ready - ${certificate.certificateNumber}`,
      text: buildEmailTextPayload({
        certificateNumber: certificate.certificateNumber,
        contactName: contactDetails.officeName,
        contactEmail: contactDetails.email,
        contactPhone: contactDetails.phone,
      }),
      html: buildEmailHtmlPayload({
        certificateNumber: certificate.certificateNumber,
        contactName: contactDetails.officeName,
        contactEmail: contactDetails.email,
        contactPhone: contactDetails.phone,
      }),
      attachments: [
        {
          filename: `${certificate.certificateNumber}.pdf`,
          path: attachment.absolutePath,
          contentType: "application/pdf",
        },
      ],
    });

    await db.$transaction((tx) =>
      updateGmcRequestStatusInTransaction(tx, {
        gmcRequestId: currentRequest.id,
        status: "RELEASED",
        reviewedById: input.staffUserId,
        reviewNotes: normalizedReviewNotes,
        dateReleased: new Date(),
        actorId: input.staffUserId,
        auditAction: "CERTIFICATE_RELEASED_AND_EMAILED",
        auditNotes: `Certificate ${certificate.certificateNumber} released and emailed.`,
      }),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to send the release email.";
    const failureReviewNotes = [
      normalizedReviewNotes,
      `Delivery failed: ${message}`,
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
      deliveryFailed: true,
      deliveryError: message,
    };
  }

  const refreshed = await loadGeneratedCertificateReviewRequest(db, input.requestId);

  if (!refreshed) {
    throw new Error("Unable to reload the certificate after release.");
  }

  return {
    draft: buildCertificateReviewDraft(refreshed),
    deliveryFailed: false,
    deliveryError: null,
  };
}
