import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { consoleEmailService } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { loadValidatedStaffSessionFromRequest } from "@/lib/staff-session";
import { loadGeneratedCertificateReviewRequest } from "@/server/services/certificate-review-service";
import { generateCertificatePdfForRequest } from "@/server/services/certificate-release-service";
import {
  buildGmcRequestProcessDraft,
  confirmGmcRequestProcess,
  findDuplicateInvoiceRequest,
  rejectGmcRequestProcess,
} from "@/server/services/gmc-request-process-service";

export const runtime = "nodejs";
export const maxDuration = 60;

type ProcessAction = "CONFIRM" | "REJECT" | "RELEASE";

const PROCESS_ACTIONS = new Set<ProcessAction>(["CONFIRM", "REJECT", "RELEASE"]);

const CERTIFICATE_PURPOSE_OPTIONS = new Set([
  "Transfer Out",
  "Employment",
  "Scholarship",
  "Internship",
  "Board Exam",
  "Other",
]);

interface ProcessRequestBody {
  action?: unknown;
  studentFullName?: unknown;
  studentIdNumber?: unknown;
  courseProgram?: unknown;
  academicYear?: unknown;
  term?: unknown;
  purposeOfCertificate?: unknown;
  officialReceiptNumber?: unknown;
  hasViolationRecord?: unknown;
  rejectionReason?: unknown;
  confirmed?: unknown;
  reviewNotes?: unknown;
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

  const message = error instanceof Error ? error.message : "Unable to process the request.";

  if (message.includes("not found")) {
    return NextResponse.json(
      { formError: "The selected request could not be found." },
      { status: 404 },
    );
  }

  if (message.includes("no longer be processed")) {
    return NextResponse.json(
      { formError: "This request can no longer be processed from this screen." },
      { status: 400 },
    );
  }

  if (message.includes("Only pending requests can be rejected")) {
    return NextResponse.json(
      { formError: "Only pending requests can be rejected." },
      { status: 400 },
    );
  }

  return NextResponse.json(
    {
      formError: "Unable to process the request right now. Please try again in a moment.",
    },
    { status: 500 },
  );
}

async function loadProcessDraft(requestId: string) {
  const request = await loadGeneratedCertificateReviewRequest(prisma, requestId);

  if (!request) {
    return { draft: null };
  }

  const invoiceNumberDuplicate = await findDuplicateInvoiceRequest(
    prisma,
    requestId,
    request.officialReceiptNumber,
  );

  return { draft: await buildGmcRequestProcessDraft(request, invoiceNumberDuplicate) };
}

export async function GET(
  _request: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      requestId: string;
    }>;
  },
) {
  const session = await loadValidatedStaffSessionFromRequest(prisma, _request);

  if (!session) {
    return NextResponse.json(
      { formError: "Your staff session has expired. Please sign in again." },
      { status: 401 },
    );
  }

  const { requestId } = await params;
  const { draft } = await loadProcessDraft(requestId);

  if (!draft) {
    return NextResponse.json(
      { formError: "The selected request could not be found." },
      { status: 404 },
    );
  }

  return NextResponse.json({ draft });
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
  const body = (await request.json().catch(() => null)) as ProcessRequestBody | null;

  if (!body) {
    return validationError({}, "Submit a valid process payload.");
  }

  const action = asText(body.action).toUpperCase() as ProcessAction;
  const fieldErrors: Record<string, string> = {};

  if (!PROCESS_ACTIONS.has(action)) {
    fieldErrors.action = "Choose a process action.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return validationError(fieldErrors);
  }

  if (action === "CONFIRM") {
    const studentFullName = asText(body.studentFullName);
    const studentIdNumber = asText(body.studentIdNumber);
    const courseProgram = asText(body.courseProgram);
    const academicYear = asText(body.academicYear);
    const term = asText(body.term);
    const purposeOfCertificate = asText(body.purposeOfCertificate);
    const officialReceiptNumber = asText(body.officialReceiptNumber);
    const hasViolationRecord =
      body.hasViolationRecord === true || body.hasViolationRecord === false
        ? body.hasViolationRecord
        : null;

    if (!studentFullName) {
      fieldErrors.studentFullName = "Student full name is required.";
    }

    if (!studentIdNumber) {
      fieldErrors.studentIdNumber = "Student ID number is required.";
    } else if (!/^\d{4}-\d{1,10}$/.test(studentIdNumber)) {
      fieldErrors.studentIdNumber =
        "Student ID must be in the format YEAR-NUMBER (4-digit year, hyphen, then up to 10 digits).";
    }

    if (!courseProgram) {
      fieldErrors.courseProgram = "Course / program is required.";
    }

    if (!academicYear) {
      fieldErrors.academicYear = "Academic year is required.";
    }

    if (!term) {
      fieldErrors.term = "Term is required.";
    }

    if (!purposeOfCertificate) {
      fieldErrors.purposeOfCertificate = "Purpose of certificate is required.";
    } else if (!CERTIFICATE_PURPOSE_OPTIONS.has(purposeOfCertificate)) {
      fieldErrors.purposeOfCertificate = "Select a valid purpose of certificate.";
    }

    if (!officialReceiptNumber) {
      fieldErrors.officialReceiptNumber = "Official receipt number is required.";
    }

    if (Object.keys(fieldErrors).length > 0) {
      return validationError(fieldErrors);
    }

    if (hasViolationRecord === null) {
      return validationError(
        { hasViolationRecord: "Choose whether the student has a violation record." },
        "Please choose whether the student has a violation record.",
      );
    }

    try {
      const draft = await confirmGmcRequestProcess(prisma, {
        requestId,
        staffUserId: session.staffUser.id,
        studentFullName,
        studentIdNumber,
        courseProgram,
        academicYear,
        term,
        purposeOfCertificate,
        officialReceiptNumber,
        hasViolationRecord,
      });

      return NextResponse.json({ draft });
    } catch (error) {
      return handleRouteError(error);
    }
  }

  if (action === "REJECT") {
    const rejectionReason = asText(body.rejectionReason);

    if (!rejectionReason) {
      return validationError(
        { rejectionReason: "A rejection reason is required." },
        "Please provide a rejection reason.",
      );
    }

    try {
      const draft = await rejectGmcRequestProcess(prisma, {
        requestId,
        staffUserId: session.staffUser.id,
        rejectionReason,
      });

      try {
        await consoleEmailService.send({
          to: draft.request.studentEmail,
          subject: `GMC request ${draft.request.requestReferenceNumber} was rejected`,
          text: [
            `Your Good Moral Certificate request ${draft.request.requestReferenceNumber} was rejected.`,
            "",
            `Reason: ${rejectionReason}`,
          ].join("\n"),
        });
      } catch (error) {
        console.error("Rejection notification failed:", error);
      }

      return NextResponse.json({ draft });
    } catch (error) {
      return handleRouteError(error);
    }
  }

  if (action === "RELEASE") {
    const confirmed = body.confirmed === true;
    const reviewNotes = asText(body.reviewNotes);

    if (!confirmed) {
      return validationError(
        { confirmation: "Confirm the certificate before releasing it." },
        "Please confirm the certificate before releasing it.",
      );
    }

    try {
      await generateCertificatePdfForRequest(prisma, {
        requestId,
        staffUserId: session.staffUser.id,
        reviewNotes: reviewNotes || null,
      });

      const { draft } = await loadProcessDraft(requestId);

      if (!draft) {
        return NextResponse.json(
          { formError: "The request could not be reloaded after release." },
          { status: 500 },
        );
      }

      if (draft.request.status === "DELIVERY_FAILED") {
        return NextResponse.json(
          {
            formError:
              "The certificate PDF could not be generated. Review the record and try again.",
            draft,
          },
          { status: 500 },
        );
      }

      return NextResponse.json({ draft });
    } catch (error) {
      return handleRouteError(error);
    }
  }

  return validationError({ action: "Choose a process action." });
}