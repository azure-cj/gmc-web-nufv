import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashStaffPassword, verifyStaffPassword } from "@/lib/staff-password";
import { loadValidatedStaffSessionFromRequest } from "@/lib/staff-session";

const DEFAULT_STAFF_PASSWORD = "gmcnufv2026";

export async function POST(request: NextRequest) {
  try {
    const validatedSession = await loadValidatedStaffSessionFromRequest(
      prisma,
      request,
    );

    if (!validatedSession) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const currentPassword = String(body.currentPassword || "").trim();
    const newPassword = String(body.newPassword || "").trim();

    if (!currentPassword) {
      return NextResponse.json(
        { error: "Current password is required." },
        { status: 400 },
      );
    }

    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json(
        { error: "New password must be at least 8 characters long." },
        { status: 400 },
      );
    }

    if (newPassword === DEFAULT_STAFF_PASSWORD) {
      return NextResponse.json(
        { error: "New password cannot be the default password." },
        { status: 400 },
      );
    }

    if (newPassword === currentPassword) {
      return NextResponse.json(
        { error: "New password must be different from your current password." },
        { status: 400 },
      );
    }

    const isCurrentPasswordValid = await verifyStaffPassword(
      currentPassword,
      validatedSession.staffUser.passwordHash,
    );

    if (!isCurrentPasswordValid) {
      return NextResponse.json(
        { error: "Current password is incorrect." },
        { status: 400 },
      );
    }

    const newPasswordHash = await hashStaffPassword(newPassword);

    await prisma.$transaction(async (tx) => {
      await tx.staffUser.update({
        where: { id: validatedSession.staffUser.id },
        data: {
          passwordHash: newPasswordHash,
          mustChangePassword: false,
        },
      });

      await tx.auditLogEntry.create({
        data: {
          actorId: validatedSession.staffUser.id,
          action: "PASSWORD_CHANGED",
          notes: "Staff member changed initial password.",
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Password changed successfully.",
      redirectUrl: "/staff",
    });
  } catch (error) {
    console.error("Staff login failed (REAL ERROR):", error);

    const devDetails =
      process.env.NODE_ENV !== "production" && error instanceof Error
        ? `: ${error.message}`
        : "";

    return NextResponse.json(
      { error: `Unable to change password right now${devDetails}.` },
      { status: 500 },
    );
  }
}
