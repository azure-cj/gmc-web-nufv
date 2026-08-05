import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { consoleEmailService } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { loadValidatedStaffSessionFromRequest } from "@/lib/staff-session";
import { reviewGmcRequest } from "@/server/services/staff-request-review-service";

export const runtime = "nodejs";

type ReviewAction = "APPROVE" | "RETURN" | "REJECT";
type PaymentVerificationChoice = "VALID" | "INVALID";

const REVIEW_ACTIONS = new Set<ReviewAction>(["APPROVE", "RETURN", "REJECT"]);
const PAYMENT_VERIFICATION_CHOICES = new Set<PaymentVerificationChoice>([
  "VALID",
  "INVALID",
]);

interface ReviewRequestBody {
  action?: unknown;
  paymentVerificationStatus?: unknown;
  officialReceiptNumber?: unknown;
  note?: unknown;
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
  const body = (await request.json().catch(() => null)) as ReviewRequestBody | null;

  if (!body) {
    return validationError({}, "Submit a valid review payload.");
  }

  const action = asText(body.action).toUpperCase() as ReviewAction;
  const paymentVerificationStatus = asText(body.paymentVerificationStatus).toUpperCase() as PaymentVerificationChoice;
  const officialReceiptNumber = asText(body.officialReceiptNumber);
  const note = asText(body.note);
  const fieldErrors: Record<string, string> = {};

  if (!REVIEW_ACTIONS.has(action)) {
    fieldErrors.action = "Choose a review action.";
  }

  if (!PAYMENT_VERIFICATION_CHOICES.has(paymentVerificationStatus)) {
    fieldErrors.paymentVerificationStatus = "Choose valid or invalid payment verification.";
  }

  if (!officialReceiptNumber) {
    fieldErrors.officialReceiptNumber = "Official receipt number is required.";
  }

  if (action === "APPROVE" && paymentVerificationStatus !== "VALID") {
    fieldErrors.paymentVerificationStatus =
      "Mark the payment as valid before approving the request.";
  }

  if (action === "RETURN" && !note) {
    fieldErrors.note = "A return note is required.";
  }

  if (action === "REJECT" && !note) {
    fieldErrors.note = "A rejection reason is required.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return validationError(fieldErrors);
  }

  try {
    const result = await reviewGmcRequest(prisma, {
      requestId,
      staffUserId: session.staffUser.id,
      action,
      paymentVerificationStatus,
      officialReceiptNumber,
      note,
    });

    if (action === "RETURN" || action === "REJECT") {
      const reason =
        result.request.returnReason ??
        result.request.rejectionReason ??
        result.request.reviewNotes ??
        note;

      await consoleEmailService.send({
        to: result.request.studentEmail,
        subject:
          action === "RETURN"
            ? `GMC request ${result.request.requestReferenceNumber} was returned`
            : `GMC request ${result.request.requestReferenceNumber} was rejected`,
        text:
          action === "RETURN"
            ? `Your Good Moral Certificate request ${result.request.requestReferenceNumber} was returned for revision. Please review the note from the Discipline Office: ${reason}`
            : `Your Good Moral Certificate request ${result.request.requestReferenceNumber} was rejected. Reason: ${reason}`,
      });
    }

    return NextResponse.json({
      requestReferenceNumber: result.request.requestReferenceNumber,
      status: result.request.status,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update the request.";

    if (message.includes("not found")) {
      return NextResponse.json(
        { formError: "The selected request could not be found." },
        { status: 404 },
      );
    }

    if (message.includes("Only pending requests")) {
      return NextResponse.json(
        { formError: "Only pending requests can be reviewed." },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        formError:
          "Unable to complete the review right now. Please try again in a moment.",
      },
      { status: 500 },
    );
  }
}
