import type {
  GmcRequest,
  PrismaClient,
  PurposeOfRequest,
} from "@prisma/client";
import type { EmailService } from "@/lib/email";
import { createRequestReferenceNumber } from "@/lib/numbering";
import type { GmcRequestSubmissionValues } from "@/lib/gmc-request";

type DatabaseClient = PrismaClient;

export interface SubmitGmcRequestResult {
  request: GmcRequest;
  requestReferenceNumber: string;
  studentName: string;
  studentEmail: string;
  submittedAt: string;
  acknowledgmentEmailSent: boolean;
}

export class DuplicateInvoiceNumberError extends Error {
  constructor(
    public readonly existingRequestReferenceNumber: string,
  ) {
    super(
      `Invoice number already used on request ${existingRequestReferenceNumber}.`,
    );
    this.name = "DuplicateInvoiceNumberError";
  }
}

export async function submitGmcRequest(
  db: DatabaseClient,
  emailService: EmailService,
  input: GmcRequestSubmissionValues,
): Promise<SubmitGmcRequestResult> {
  const submittedAt = new Date();

  let request: GmcRequest | null = null;
  let requestReferenceNumber = "";
  let studentName = "";

  const existingInvoiceRequest = await db.gmcRequest.findFirst({
    where: {
      officialReceiptNumber: input.paymentReceiptNumber,
    },
    select: { requestReferenceNumber: true },
  });

  if (existingInvoiceRequest) {
    throw new DuplicateInvoiceNumberError(
      existingInvoiceRequest.requestReferenceNumber,
    );
  }

  await db.$transaction(async (tx) => {
    const student = await tx.student.upsert({
      where: { studentId: input.studentId },
      create: {
        studentId: input.studentId,
        firstName: input.firstName,
        middleInitial: input.middleInitial,
        lastName: input.lastName,
        courseProgram: input.courseProgram,
        academicYear: input.academicYear,
        email: input.email,
      },
      update: {
        firstName: input.firstName,
        middleInitial: input.middleInitial,
        lastName: input.lastName,
        courseProgram: input.courseProgram,
        academicYear: input.academicYear,
        email: input.email,
      },
    });

    studentName = [student.firstName, student.middleInitial, student.lastName]
      .filter(Boolean)
      .join(" ");

    requestReferenceNumber = await createRequestReferenceNumber(
      tx,
      submittedAt,
    );

    request = await tx.gmcRequest.create({
      data: {
        requestReferenceNumber,
        studentId: student.studentId,
        studentTitlePrefix: input.titlePrefix,
        studentFirstName: input.firstName,
        studentMiddleInitial: input.middleInitial,
        studentLastName: input.lastName,
        studentCourseProgram: input.courseProgram,
        studentAcademicYear: input.academicYear,
        term: input.term,
        studentEmail: input.email,
        purposeOfRequest: input.purposeOfRequest as PurposeOfRequest,
        officialReceiptNumber: input.paymentReceiptNumber,
        status: "PENDING",
        paymentVerificationStatus: "UNVERIFIED",
        accuracyCertified: input.accuracyCertified,
        accuracyCertifiedAt: input.accuracyCertified ? submittedAt : null,
        dateSubmitted: submittedAt,
      },
    });

    await tx.auditLogEntry.create({
      data: {
        gmcRequestId: request.id,
        actorId: null,
        action: "REQUEST_SUBMITTED",
        notes: `Request submitted with reference number ${requestReferenceNumber}.`,
      },
    });
  });

  if (!request) {
    throw new Error("Failed to create GMC request.");
  }

  let acknowledgmentEmailSent = false;

  try {
    await emailService.send({
      to: input.email,
      subject: `GMC Request Received - ${requestReferenceNumber}`,
      text: [
        `Hello ${studentName || input.firstName},`,
        "",
        "Your Good Moral Certificate request has been received.",
        `Reference Number: ${requestReferenceNumber}`,
        "",
        "The Discipline Office will review your submission. You can track your request status anytime using your reference number on the Track Request page.",
      ].join("\n"),
      html: [
        `<p>Hello ${studentName || input.firstName},</p>`,
        "<p>Your Good Moral Certificate request has been received.</p>",
        `<p><strong>Reference Number:</strong> ${requestReferenceNumber}</p>`,
        "<p>The Discipline Office will review your submission. You can track your request status anytime using your reference number on the Track Request page.</p>",
      ].join(""),
    });
    acknowledgmentEmailSent = true;
  } catch (error) {
    console.error("Acknowledgment email failed:", error);
  }

  return {
    request,
    requestReferenceNumber,
    studentName,
    studentEmail: input.email,
    submittedAt: submittedAt.toISOString(),
    acknowledgmentEmailSent,
  };
}
