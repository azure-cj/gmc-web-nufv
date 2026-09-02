import { NextResponse } from "next/server";
import { consoleEmailService } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { getStorageService } from "@/lib/storage";
import { submitGmcRequest } from "@/server/services/gmc-request-intake-service";
import { validateGmcRequestSubmission } from "@/lib/gmc-request";
import { getCurrentAcademicYear, getCurrentTerm } from "@/lib/system-settings";

export const runtime = "nodejs";

function getFormText(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function getFormFile(formData: FormData, key: string): File | null {
  const value = formData.get(key);
  if (!value || typeof value === "string") {
    return null;
  }

  return typeof value.arrayBuffer === "function" ? value : null;
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
      paymentProofFile: getFormFile(formData, "paymentProofFile"),
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
      getStorageService(),
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
