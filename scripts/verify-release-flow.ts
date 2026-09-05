import { prisma } from "../src/lib/prisma";
import { createRequestReferenceNumber } from "../src/lib/numbering";
import { releaseGmcRequestProcess } from "../src/server/services/gmc-request-process-service";
import { renderCertificateHtmlToPdfBuffer } from "../src/server/services/certificate-pdf-service";
import { buildCertificateVerificationUrl } from "../src/templates/gmc-certificate-template";
import { PDFDocument } from "pdf-lib";

async function main(): Promise<void> {
  const email = `verify-test-${Date.now()}@test.local`;
  const studentId = `2026-${Date.now().toString().slice(-8)}`;

  const student = await prisma.student.upsert({
    where: { studentId },
    update: {},
    create: {
      studentId,
      firstName: "QR",
      middleInitial: "V",
      lastName: "Test",
      courseProgram: "BS Computer Science",
      academicYear: "2025-2026",
      email,
    },
  });

  let staffUser = await prisma.staffUser.findFirst({
    where: { isActive: true },
  });

  if (!staffUser) {
    staffUser = await prisma.staffUser.create({
      data: {
        name: "Verification Test Staff",
        email: "verify-test-staff@test.local",
        passwordHash: "placeholder",
        role: "ADMIN",
      },
    });
  }

  const gmcRequest = await prisma.gmcRequest.create({
    data: {
      requestReferenceNumber: await createRequestReferenceNumber(prisma, new Date()),
      studentId: student.studentId,
      studentTitlePrefix: null,
      studentFirstName: student.firstName,
      studentMiddleInitial: student.middleInitial,
      studentLastName: student.lastName,
      studentCourseProgram: student.courseProgram,
      studentAcademicYear: student.academicYear,
      term: "Term 2",
      studentEmail: student.email,
      purposeOfRequest: "EMPLOYMENT",
      officialReceiptNumber: `OR-${Date.now()}`,
      hasViolationRecord: false,
    },
  });

  await releaseGmcRequestProcess(prisma, {
    requestId: gmcRequest.id,
    staffUserId: staffUser.id,
    studentFullName: `${student.firstName} ${student.middleInitial}. ${student.lastName}`,
    studentIdNumber: student.studentId,
    courseProgram: student.courseProgram,
    academicYear: student.academicYear,
    term: "Term 2",
    purposeOfCertificate: "Employment",
    officialReceiptNumber: gmcRequest.officialReceiptNumber!,
    hasViolationRecord: false,
  });

  const certificate = await prisma.certificate.findUniqueOrThrow({
    where: { gmcRequestId: gmcRequest.id },
  });

  const pdfBuffer = await renderCertificateHtmlToPdfBuffer(
    certificate.previewHtml!,
  );
  const pdf = await PDFDocument.load(pdfBuffer);
  const pageCount = pdf.getPageCount();

  const verificationUrl = certificate.verificationToken
    ? buildCertificateVerificationUrl(certificate.verificationToken)
    : null;

  const summary = {
    requestId: gmcRequest.id,
    certificateNumber: certificate.certificateNumber,
    verificationToken: certificate.verificationToken ?? null,
    status: certificate.status,
    verificationUrl,
    qrEmbedded: certificate.previewHtml?.includes('class="qr-image"') ?? false,
    dataUriPresent: certificate.previewHtml?.includes("data:image/png;base64,") ?? false,
    pdfPageCount: pageCount,
    pdfBytes: pdfBuffer.length,
  };

  const failures: string[] = [];
  if (!certificate.verificationToken) failures.push("verificationToken missing");
  if (certificate.status !== "ACTIVE") failures.push(`status is ${certificate.status}`);
  if (!summary.qrEmbedded) failures.push("qr-image block missing");
  if (!summary.dataUriPresent) failures.push("QR data URI missing");
  if (!verificationUrl?.includes(`/verify/${certificate.verificationToken}`)) {
    failures.push("verification URL malformed");
  }
  if (pageCount !== 1) failures.push(`pdf page count = ${pageCount}`);

  console.log(JSON.stringify({ ok: failures.length === 0, summary, failures }, null, 2));

  if (failures.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});