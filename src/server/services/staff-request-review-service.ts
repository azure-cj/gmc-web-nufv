import type { GmcRequest, PrismaClient, StaffUser } from "@prisma/client";
import { issueCertificateForLoadedRequest } from "@/server/services/certificate-service";
import { DEFAULT_CERTIFICATE_AUTHORIZED_SIGNATORY, warmSignatureImageCache } from "@/server/services/certificate-template";

export type StaffReviewAction = "APPROVE" | "RETURN" | "REJECT";

export interface ReviewGmcRequestInput {
  requestId: string;
  staffUserId: string;
  action: StaffReviewAction;
  paymentVerificationStatus: "VALID" | "INVALID";
  officialReceiptNumber: string;
  note: string;
}

export interface ReviewGmcRequestResult {
  request: GmcRequest;
  staffUser: StaffUser;
}

export async function reviewGmcRequest(
  db: PrismaClient,
  input: ReviewGmcRequestInput,
): Promise<ReviewGmcRequestResult> {
  await warmSignatureImageCache(DEFAULT_CERTIFICATE_AUTHORIZED_SIGNATORY);

  return db.$transaction(async (tx) => {
    const request = await tx.gmcRequest.findUnique({
      where: { id: input.requestId },
    });

    if (!request) {
      throw new Error("GMC request not found.");
    }

    if (request.status !== "PENDING") {
      throw new Error("Only pending requests can be reviewed.");
    }

    const staffUser = await tx.staffUser.findUnique({
      where: { id: input.staffUserId },
    });

    if (!staffUser) {
      throw new Error("Staff session is invalid.");
    }

    const note = input.note.trim();
    let updateData:
      | {
          status: "APPROVED" | "GENERATED";
          paymentVerificationStatus: "VALID" | "INVALID";
          reviewNotes: string | null;
          rejectionReason: null;
          returnReason: null;
        }
      | {
          status: "RETURNED";
          paymentVerificationStatus: "VALID" | "INVALID";
          reviewNotes: string;
          rejectionReason: null;
          returnReason: string;
        }
      | {
          status: "REJECTED";
          paymentVerificationStatus: "VALID" | "INVALID";
          reviewNotes: string;
          rejectionReason: string;
          returnReason: null;
        };

    switch (input.action) {
      case "APPROVE": {
        if (input.paymentVerificationStatus !== "VALID") {
          throw new Error("Mark payment as valid before approving the request.");
        }

        updateData = {
          status: "APPROVED",
          paymentVerificationStatus: "VALID",
          reviewNotes: note || "Approved after manual review.",
          rejectionReason: null,
          returnReason: null,
        };
        break;
      }
      case "RETURN": {
        if (!note) {
          throw new Error("A return note is required.");
        }

        updateData = {
          status: "RETURNED",
          paymentVerificationStatus: input.paymentVerificationStatus,
          reviewNotes: note,
          rejectionReason: null,
          returnReason: note,
        };
        break;
      }
      case "REJECT": {
        if (!note) {
          throw new Error("A rejection reason is required.");
        }

        updateData = {
          status: "REJECTED",
          paymentVerificationStatus: input.paymentVerificationStatus,
          reviewNotes: note,
          rejectionReason: note,
          returnReason: null,
        };
        break;
      }
      default:
        throw new Error("Unsupported review action.");
    }

    const updatedRequest = await tx.gmcRequest.update({
      where: { id: request.id },
      data: {
        ...updateData,
        officialReceiptNumber: input.officialReceiptNumber,
        reviewedById: staffUser.id,
      },
    });

    await tx.auditLogEntry.create({
      data: {
        gmcRequestId: request.id,
        actorId: staffUser.id,
        action:
          input.action === "APPROVE"
            ? "REQUEST_APPROVED"
            : input.action === "RETURN"
              ? "REQUEST_RETURNED"
              : "REQUEST_REJECTED",
        notes: note || null,
      },
    });

    if (input.action === "APPROVE") {
      const approvedRequest = await tx.gmcRequest.findUnique({
        where: { id: request.id },
        include: { certificate: true },
      });

      if (!approvedRequest) {
        throw new Error("GMC request not found after approval.");
      }

      await issueCertificateForLoadedRequest(tx, approvedRequest, {
        gmcRequestId: request.id,
        authorizedSignatory: DEFAULT_CERTIFICATE_AUTHORIZED_SIGNATORY,
        officeDesignation: "Discipline Office",
        actorId: staffUser.id,
      });

      const generatedRequest = await tx.gmcRequest.update({
        where: { id: request.id },
        data: {
          status: "GENERATED",
          reviewedById: staffUser.id,
        },
      });

      await tx.auditLogEntry.create({
        data: {
          gmcRequestId: request.id,
          actorId: staffUser.id,
          action: "REQUEST_GENERATED",
          notes:
            "Certificate preview prepared and request moved to the generated sub-state.",
        },
      });

      return {
        request: generatedRequest,
        staffUser,
      };
    }

    return {
      request: updatedRequest,
      staffUser,
    };
  });
}
