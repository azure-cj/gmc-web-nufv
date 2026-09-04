import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { loadValidatedStaffSessionFromRequest } from "@/lib/staff-session";
import {
  buildStaffRequestReadOnlyDetail,
  getStaffRequestDetail,
} from "@/server/services/staff-request-detail-service";

export const runtime = "nodejs";

export async function GET(
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
  const requestRecord = await getStaffRequestDetail(prisma, requestId);
  const detail = buildStaffRequestReadOnlyDetail(requestRecord);

  if (!detail) {
    return NextResponse.json(
      { formError: "The selected request could not be found." },
      { status: 404 },
    );
  }

  return NextResponse.json({ detail });
}