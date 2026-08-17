import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { loadValidatedStaffSessionFromRequest } from "@/lib/staff-session";
import { hashStaffPassword } from "@/lib/staff-password";
import { StaffRole } from "@prisma/client";

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

    if (validatedSession.staffUser.role !== StaffRole.ADMIN) {
      return NextResponse.json(
        { error: "Access denied. Admin privileges required." },
        { status: 403 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const role = String(body.role || "").trim() as StaffRole;

    if (!name) {
      return NextResponse.json(
        { error: "Full name is required." },
        { status: 400 },
      );
    }

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Valid email address is required." },
        { status: 400 },
      );
    }

    if (!Object.values(StaffRole).includes(role)) {
      return NextResponse.json(
        { error: "Invalid role specified." },
        { status: 400 },
      );
    }

    const existingUser = await prisma.staffUser.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "A staff account with this email address already exists." },
        { status: 409 },
      );
    }

    const defaultPasswordHash = await hashStaffPassword(DEFAULT_STAFF_PASSWORD);

    const newUser = await prisma.$transaction(async (tx) => {
      const user = await tx.staffUser.create({
        data: {
          name,
          email,
          role,
          passwordHash: defaultPasswordHash,
          mustChangePassword: true,
          isActive: true,
        },
      });

      await tx.auditLogEntry.create({
        data: {
          gmcRequestId: null,
          actorId: validatedSession.staffUser.id,
          action: "STAFF_USER_CREATED",
          notes: `Admin created staff account (${user.name}, ${user.email}, ${user.role}).`,
        },
      });

      return user;
    });

    return NextResponse.json({
      success: true,
      message: "Staff account created successfully.",
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        isActive: newUser.isActive,
        mustChangePassword: newUser.mustChangePassword,
      },
    });
  } catch (error) {
    console.error("Create staff user error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while creating the account." },
      { status: 500 },
    );
  }
}
