import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashStaffPassword, verifyStaffPassword } from "@/lib/staff-password";
import {
  loadValidatedStaffSessionFromRequest,
  revokeOtherStaffSessions,
} from "@/lib/staff-session";

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

    const revokedCount = await prisma.$transaction(async (tx) => {
      await tx.staffUser.update({
        where: { id: validatedSession.staffUser.id },
        data: {
          passwordHash: newPasswordHash,
          mustChangePassword: false,
        },
      });

      const revoked = await revokeOtherStaffSessions(
        tx,
        validatedSession.staffUser.id,
        validatedSession.session.id,
      );

      await tx.auditLogEntry.create({
        data: {
          gmcRequestId: null,
          actorId: validatedSession.staffUser.id,
          action: "PASSWORD_CHANGED",
          notes: "Staff member updated account password from Settings.",
        },
      });

      return revoked;
    });

    return NextResponse.json({
      success: true,
      message:
        revokedCount > 0
          ? `Password updated successfully. ${revokedCount} other active session(s) on other devices have been logged out.`
          : "Password updated successfully.",
      revokedSessionCount: revokedCount,
    });
  } catch (error) {
    console.error("Settings password update error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 },
    );
  }
}
