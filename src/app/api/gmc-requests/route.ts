import { NextResponse } from "next/server";
import { consoleEmailService } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { submitGmcRequest, DuplicateInvoiceNumberError } from "@/server/services/gmc-request-intake-service";
import { validateGmcRequestSubmission } from "@/lib/gmc-request";
import { getCurrentAcademicYear, getCurrentTerm } from "@/lib/system-settings";

export const runtime = "nodejs";
export const maxDuration = 60;

function getFormText(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function POST(request: Request) {
  try {
    const [formData, currentAcademicYear, currentTerm] = await Promise.all([
      request.formData(),
      getCurrentAcademicYear(),
      getCurrentTerm(),
    ]);

    const validation = await validateGmcRequestSubmission({
      studentId: getFormText(formData, "studentId"),
      titlePrefix: getFormText(formData, "titlePrefix"),
      firstName: getFormText(formData, "firstName"),
      middleInitial: getFormText(formData, "middleInitial"),
      lastName: getFormText(formData, "lastName"),
      courseProgram: getFormText(formData, "courseProgram"),
      academicYear: currentAcademicYear,
      term: currentTerm,
      purposeOfRequest: getFormText(formData, "purposeOfRequest"),
      email: getFormText(formData, "email"),
      paymentReceiptNumber: getFormText(formData, "paymentReceiptNumber"),
      accuracyCertified: formData.get("accuracyCertified") === "true",
    });

    if (!validation.values) {
      return NextResponse.json(
        {
          fieldErrors: validation.fieldErrors,
          formError: "Please correct the highlighted fields.",
        },
        { status: 400 },
      );
    }

    const result = await submitGmcRequest(
      prisma,
      consoleEmailService,
      validation.values,
    );

    return NextResponse.json(
      {
        requestReferenceNumber: result.requestReferenceNumber,
        submittedAt: result.submittedAt,
        studentName: result.studentName,
        studentEmail: result.studentEmail,
        acknowledgmentEmailSent: result.acknowledgmentEmailSent,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof DuplicateInvoiceNumberError) {
      return NextResponse.json(
        {
          fieldErrors: {
            paymentReceiptNumber:
              "This invoice number has already been used for a request. If you believe this is an error, please contact the Discipline Office.",
          },
          formError: "This invoice number has already been used for a request.",
        },
        { status: 409 },
      );
    }

    console.error("GMC request submission failed:", error);
    return NextResponse.json(
      {
        formError:
          "Unable to submit your request right now. Please try again in a moment.",
      },
      { status: 500 },
    );
  }
}
