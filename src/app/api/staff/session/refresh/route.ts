import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  loadValidatedStaffSessionFromRequest,
  renewStaffSessionIfNeeded,
} from "@/lib/staff-session";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const session = await loadValidatedStaffSessionFromRequest(prisma, request);

  if (!session) {
    return NextResponse.json(
      { formError: "Your staff session has expired. Please sign in again." },
      { status: 401 },
    );
  }

  const response = NextResponse.json({
    ok: true,
    staffUser: {
      name: session.staffUser.name,
      email: session.staffUser.email,
      role: session.staffUser.role,
    },
  });

  await renewStaffSessionIfNeeded(prisma, session, response);

  return response;
}
