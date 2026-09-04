import { prisma } from "@/lib/prisma";
import { getStorageService } from "@/lib/storage";
import { renderHtmlToPdfBuffer } from "./html-to-pdf-service";
import {
  buildGoodMoralCertificateHtml,
  DEFAULT_CERTIFICATE_AUTHORIZED_SIGNATORY,
  DEFAULT_CERTIFICATE_OFFICE_DESIGNATION,
} from "./certificate-template";

export { renderHtmlToPdfBuffer as renderCertificateHtmlToPdfBuffer } from "./html-to-pdf-service";

export async function regenerateCertificatePdfOnDemand(fileReference: string): Promise<{
  pdfBuffer: Buffer;
  filename: string;
  generatedPdfUrl: string;
} | null> {
  const cleanRef = fileReference.trim();

  const certificate = await prisma.certificate.findFirst({
    where: {
      OR: [
        { generatedPdfUrl: cleanRef },
        { generatedPdfUrl: { endsWith: cleanRef } },
        { certificateNumber: cleanRef },
      ],
    },
    include: {
      gmcRequest: true,
    },
  });

  if (!certificate) {
    return null;
  }

  const html =
    certificate.previewHtml ||
    (await buildGoodMoralCertificateHtml({
      certificateNumber: certificate.certificateNumber,
      studentFullName:
        certificate.studentFullName ||
        `${certificate.gmcRequest.studentFirstName} ${certificate.gmcRequest.studentLastName}`,
      studentId: certificate.studentIdNumber || certificate.gmcRequest.studentId,
      courseProgram:
        certificate.courseProgram || certificate.gmcRequest.studentCourseProgram,
      term: certificate.gmcRequest.term || "",
      academicYear:
        certificate.academicYear || certificate.gmcRequest.studentAcademicYear,
      studentTitlePrefix: certificate.gmcRequest.studentTitlePrefix ?? null,
      purposeOfRequest: certificate.gmcRequest.purposeOfRequest,
      officialReceiptNumber: certificate.gmcRequest.officialReceiptNumber ?? null,
      hasViolationRecord: certificate.gmcRequest.hasViolationRecord,
      dateOfIssuance: certificate.dateOfIssuance,
      authorizedSignatory:
        certificate.authorizedSignatory ||
        DEFAULT_CERTIFICATE_AUTHORIZED_SIGNATORY,
      officeDesignation:
        certificate.officeDesignation || DEFAULT_CERTIFICATE_OFFICE_DESIGNATION,
    }));

  const pdfBuffer = await renderHtmlToPdfBuffer(html);

  const storedPdf = await getStorageService().upload({
    buffer: pdfBuffer,
    filename: `${certificate.certificateNumber}.pdf`,
    contentType: "application/pdf",
    subdirectory: "generated-certificates",
  });

  await prisma.certificate.update({
    where: { id: certificate.id },
    data: {
      generatedPdfUrl: storedPdf.url,
      previewHtml: html,
    },
  });

  await prisma.auditLogEntry.create({
    data: {
      gmcRequestId: certificate.gmcRequestId,
      actorId: null,
      action: "CERTIFICATE_PDF_REGENERATED_ON_DEMAND",
      notes: `Certificate PDF ${certificate.certificateNumber} regenerated on demand from template HTML following storage purge.`,
    },
  });

  return {
    pdfBuffer,
    filename: `${certificate.certificateNumber}.pdf`,
    generatedPdfUrl: storedPdf.url,
  };
}
