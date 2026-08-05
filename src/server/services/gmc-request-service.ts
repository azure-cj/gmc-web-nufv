import {
  type GmcRequest,
  type GmcRequestStatus,
  type PaymentVerificationStatus,
  type Prisma,
  type PrismaClient,
  type PurposeOfRequest,
} from "@prisma/client";
import { createRequestReferenceNumber } from "../../lib/numbering";

type DatabaseClient = PrismaClient;

export interface CreateGmcRequestInput {
  studentId: string;
  titlePrefix?: string | null;
  purposeOfRequest: PurposeOfRequest;
  paymentProofFileUrl: string;
  submittedAt?: Date;
  actorId?: string | null;
}

export interface UpdateGmcRequestStatusInput {
  gmcRequestId: string;
  status: GmcRequestStatus;
  reviewedById?: string | null;
  reviewNotes?: string | null;
  officialReceiptNumber?: string | null;
  rejectionReason?: string | null;
  returnReason?: string | null;
  paymentVerificationStatus?: PaymentVerificationStatus;
  dateReleased?: Date | null;
  actorId?: string | null;
  auditAction?: string;
  auditNotes?: string | null;
}

function auditActionForStatus(status: GmcRequestStatus): string {
  switch (status) {
    case "APPROVED":
      return "REQUEST_APPROVED";
    case "GENERATED":
      return "REQUEST_GENERATED";
    case "REJECTED":
      return "REQUEST_REJECTED";
    case "RETURNED":
      return "REQUEST_RETURNED";
    case "RELEASED":
      return "REQUEST_RELEASED";
    case "DELIVERY_FAILED":
      return "REQUEST_DELIVERY_FAILED";
    case "PENDING":
    default:
      return "REQUEST_RESTORED_TO_PENDING";
  }
}

export async function createGmcRequest(
  db: DatabaseClient,
  input: CreateGmcRequestInput,
): Promise<GmcRequest> {
  const submittedAt = input.submittedAt ?? new Date();

  return db.$transaction(async (tx) => {
    const student = await tx.student.findUnique({
      where: { studentId: input.studentId },
    });

    if (!student) {
      throw new Error(`Student ${input.studentId} was not found.`);
    }

    const requestReferenceNumber = await createRequestReferenceNumber(
      tx,
      submittedAt,
    );

    const request = await tx.gmcRequest.create({
      data: {
        requestReferenceNumber,
        studentId: student.studentId,
        studentTitlePrefix: input.titlePrefix ?? null,
        studentFirstName: student.firstName,
        studentMiddleInitial: student.middleInitial,
        studentLastName: student.lastName,
        studentCourseProgram: student.courseProgram,
        studentAcademicYear: student.academicYear,
        studentEmail: student.email,
        purposeOfRequest: input.purposeOfRequest,
        paymentProofFileUrl: input.paymentProofFileUrl,
        dateSubmitted: submittedAt,
      },
    });

    await tx.auditLogEntry.create({
      data: {
        gmcRequestId: request.id,
        actorId: input.actorId ?? null,
        action: "REQUEST_SUBMITTED",
        notes: `Request submitted with reference number ${requestReferenceNumber}.`,
      },
    });

    return request;
  });
}

export async function updateGmcRequestStatus(
  db: DatabaseClient,
  input: UpdateGmcRequestStatusInput,
): Promise<GmcRequest> {
  return db.$transaction(async (tx) => {
    return updateGmcRequestStatusInTransaction(tx, input);
  });
}

export async function updateGmcRequestStatusInTransaction(
  tx: Prisma.TransactionClient,
  input: UpdateGmcRequestStatusInput,
): Promise<GmcRequest> {
  const updatedRequest = await tx.gmcRequest.update({
    where: { id: input.gmcRequestId },
    data: {
      status: input.status,
      ...(input.reviewedById !== undefined ? { reviewedById: input.reviewedById } : {}),
      ...(input.reviewNotes !== undefined ? { reviewNotes: input.reviewNotes } : {}),
      ...(input.officialReceiptNumber !== undefined
        ? { officialReceiptNumber: input.officialReceiptNumber }
        : {}),
      ...(input.rejectionReason !== undefined
        ? { rejectionReason: input.rejectionReason }
        : {}),
      ...(input.returnReason !== undefined ? { returnReason: input.returnReason } : {}),
      ...(input.paymentVerificationStatus !== undefined
        ? { paymentVerificationStatus: input.paymentVerificationStatus }
        : {}),
      ...(input.dateReleased !== undefined ? { dateReleased: input.dateReleased } : {}),
    },
  });

  await tx.auditLogEntry.create({
    data: {
      gmcRequestId: updatedRequest.id,
      actorId: input.actorId ?? null,
      action: input.auditAction ?? auditActionForStatus(input.status),
      notes:
        input.auditNotes ??
        input.reviewNotes ??
        input.rejectionReason ??
        input.returnReason ??
        null,
    },
  });

  return updatedRequest;
}
