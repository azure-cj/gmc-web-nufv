import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createStaffSession,
  setStaffSessionCookie,
} from "@/lib/staff-session";
import {
  getClientIpAddress,
  getStaffLoginLockout,
  recordStaffLoginAttempt,
} from "@/lib/staff-login-attempts";
import { verifyStaffPassword } from "@/lib/staff-password";

export const runtime = "nodejs";

function getFormText(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function redirectToLogin(request: Request, message: string): NextResponse {
  return NextResponse.redirect(
    new URL(`/staff/login?error=${encodeURIComponent(message)}`, request.url),
  );
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const email = getFormText(formData, "email").trim();
    const password = getFormText(formData, "password");
    const returnTo = getFormText(formData, "returnTo").trim() || "/staff";
    const safeReturnTo = returnTo.startsWith("/") ? returnTo : "/staff";
    const ipAddress = getClientIpAddress(request);
    const userAgent = request.headers.get("user-agent") ?? null;

    if (!email || !password) {
      return redirectToLogin(request, "Invalid email or password.");
    }

    const lockout = await getStaffLoginLockout(prisma, email, ipAddress);
    if (lockout.blocked) {
      return NextResponse.redirect(
        new URL(
          "/staff/login?error=Too%20many%20failed%20sign-in%20attempts.%20Please%20try%20again%20later.",
          request.url,
        ),
        303,
      );
    }

    const staffUser = await prisma.staffUser.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!staffUser) {
      await recordStaffLoginAttempt(prisma, {
        email,
        ipAddress,
        success: false,
      });
      return redirectToLogin(request, "Invalid email or password.");
    }

    if (!staffUser.isActive) {
      await recordStaffLoginAttempt(prisma, {
        email,
        ipAddress,
        success: false,
      });
      return redirectToLogin(
        request,
        "Your account has been deactivated. Please contact an administrator.",
      );
    }

    const isPasswordValid = await verifyStaffPassword(password, staffUser.passwordHash);

    if (!isPasswordValid) {
      await recordStaffLoginAttempt(prisma, {
        email,
        ipAddress,
        success: false,
      });
      return redirectToLogin(request, "Invalid email or password.");
    }

    const { sessionToken } = await createStaffSession(prisma, {
      staffUserId: staffUser.id,
      ipAddress,
      userAgent,
    });

    await recordStaffLoginAttempt(prisma, {
      email,
      ipAddress,
      success: true,
    });

    const response = NextResponse.redirect(new URL(safeReturnTo, request.url), 303);

    setStaffSessionCookie(response, sessionToken);

    return response;
  } catch (error: any) {
    console.error("Staff login failed (REAL ERROR):", error);

    const devDetails =
      process.env.NODE_ENV !== "production" && error?.message
        ? `: ${error.message}`
        : "";

    return redirectToLogin(
      request,
      `Unable to sign in right now${devDetails}. Please try again in a moment.`,
    );
  }
}
