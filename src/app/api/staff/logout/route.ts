import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  clearStaffSessionCookie,
  getStaffSessionTokenFromRequest,
  revokeStaffSession,
} from "@/lib/staff-session";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const sessionToken = getStaffSessionTokenFromRequest(request);
  await revokeStaffSession(prisma, sessionToken);
  const response = NextResponse.redirect(new URL("/staff/login", request.url));
  clearStaffSessionCookie(response);
  return response;
}
