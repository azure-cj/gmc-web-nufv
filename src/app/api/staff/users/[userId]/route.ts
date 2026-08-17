import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { loadValidatedStaffSessionFromRequest } from "@/lib/staff-session";
import { StaffRole } from "@prisma/client";

interface RouteParams {
  params: Promise<{
    userId: string;
  }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await params;
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

    if (validatedSession.staffUser.role !== StaffRole.ADMIN) {
      return NextResponse.json(
        { error: "Access denied. Admin privileges required." },
        { status: 403 },
      );
    }

    const targetUser = await prisma.staffUser.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: "Staff user account not found." },
        { status: 404 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const newRole = body.role ? (String(body.role).trim() as StaffRole) : undefined;
    const newIsActive = typeof body.isActive === "boolean" ? body.isActive : undefined;

    if (newRole !== undefined && !Object.values(StaffRole).includes(newRole)) {
      return NextResponse.json(
        { error: "Invalid role specified." },
        { status: 400 },
      );
    }

    if (newIsActive === false && userId === validatedSession.staffUser.id) {
      return NextResponse.json(
        { error: "You cannot deactivate your own admin account." },
        { status: 400 },
      );
    }

    const updatedUser = await prisma.$transaction(async (tx) => {
      const dataToUpdate: { role?: StaffRole; isActive?: boolean } = {};
      const auditNotes: string[] = [];

      if (newRole !== undefined && newRole !== targetUser.role) {
        dataToUpdate.role = newRole;
        auditNotes.push(`role changed from ${targetUser.role} to ${newRole}`);
      }

      if (newIsActive !== undefined && newIsActive !== targetUser.isActive) {
        dataToUpdate.isActive = newIsActive;
        auditNotes.push(newIsActive ? "account reactivated" : "account deactivated");
      }

      if (Object.keys(dataToUpdate).length === 0) {
        return targetUser;
      }

      const updated = await tx.staffUser.update({
        where: { id: userId },
        data: dataToUpdate,
      });

      // If deactivating user, immediately revoke ALL active sessions
      if (newIsActive === false) {
        await tx.staffSession.updateMany({
          where: {
            staffUserId: userId,
            revokedAt: null,
          },
          data: {
            revokedAt: new Date(),
          },
        });
      }

      const action =
        newIsActive === false
          ? "STAFF_USER_DEACTIVATED"
          : newIsActive === true
            ? "STAFF_USER_REACTIVATED"
            : "STAFF_USER_ROLE_UPDATED";

      await tx.auditLogEntry.create({
        data: {
          gmcRequestId: null,
          actorId: validatedSession.staffUser.id,
          action,
          notes: `Admin updated staff account (${targetUser.email}): ${auditNotes.join(", ")}.`,
        },
      });

      return updated;
    });

    return NextResponse.json({
      success: true,
      message: "Staff account updated successfully.",
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        isActive: updatedUser.isActive,
      },
    });
  } catch (error) {
    console.error("Update staff user error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while updating the account." },
      { status: 500 },
    );
  }
}
