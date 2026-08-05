import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { loadValidatedStaffSessionFromRequest } from "@/lib/staff-session";
import {
  buildRecordsArchiveReportCsv,
  buildRecordsArchiveReportData,
  buildRecordsArchiveExportFilename,
  getRecordsArchiveReportRecords,
  logRecordsArchiveExportAuditEntries,
  renderRecordsArchiveReportPdf,
} from "@/server/services/records-archive-service";
import { parseRecordsArchiveReportFilters } from "@/lib/records-archive-query";

export const runtime = "nodejs";

function redirectToLogin(request: NextRequest, message: string): NextResponse {
  return NextResponse.redirect(
    new URL(`/staff/login?error=${encodeURIComponent(message)}`, request.url),
  );
}

export async function GET(request: NextRequest) {
  const session = await loadValidatedStaffSessionFromRequest(prisma, request);

  if (!session) {
    return redirectToLogin(
      request,
      "Your staff session has expired. Please sign in again.",
    );
  }

  const format = (request.nextUrl.searchParams.get("format") ?? "csv")
    .trim()
    .toLowerCase();

  if (format !== "csv" && format !== "pdf") {
    return NextResponse.json(
      { formError: "Choose a valid export format." },
      { status: 400 },
    );
  }

  const reportFilters = parseRecordsArchiveReportFilters({
    reportStatus: request.nextUrl.searchParams.get("reportStatus") ?? undefined,
    reportFrom: request.nextUrl.searchParams.get("reportFrom") ?? undefined,
    reportTo: request.nextUrl.searchParams.get("reportTo") ?? undefined,
    reportProgram: request.nextUrl.searchParams.get("reportProgram") ?? undefined,
    breakdown: request.nextUrl.searchParams.get("breakdown") ?? undefined,
  });

  const records = await getRecordsArchiveReportRecords(prisma, reportFilters);
  const reportData = buildRecordsArchiveReportData(reportFilters, records);
  const filename = buildRecordsArchiveExportFilename(reportData, format);

  await prisma.$transaction(async (tx) => {
    await logRecordsArchiveExportAuditEntries(tx, {
      actorId: session.staffUser.id,
      format,
      filters: reportFilters,
      requestIds: records.map((record) => record.id),
    });
  });

  if (format === "csv") {
    const csv = buildRecordsArchiveReportCsv(reportData);
    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const pdfBuffer = await renderRecordsArchiveReportPdf(reportData);

  return new Response(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
