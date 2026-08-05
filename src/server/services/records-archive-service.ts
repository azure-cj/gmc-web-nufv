import type { GmcRequestStatus, Prisma, PrismaClient } from "@prisma/client";
import { parseBusinessDateString } from "@/lib/business-time";
import {
  formatBusinessDate,
  formatBusinessDateTime,
  formatPaymentVerificationLabel,
  formatPurposeLabel,
  formatRequestStatusLabel,
} from "@/lib/gmc-request";
import {
  RECORDS_ARCHIVE_BREAKDOWNS,
  RECORDS_ARCHIVE_REPORT_STATUSES,
  type RecordsArchiveBreakdown,
  type RecordsArchiveFilters,
  type RecordsArchiveReportFilters,
  type RecordsArchiveReportStatusFilter,
  type RecordsArchiveStatusFilter,
} from "@/lib/records-archive-query";
import { renderHtmlToPdfBuffer } from "./html-to-pdf-service";

const RECORDS_ARCHIVE_PAGE_SIZE = 10;
const CERTIFICATE_REPORT_STATUSES: GmcRequestStatus[] = [
  "GENERATED",
  "RELEASED",
  "DELIVERY_FAILED",
];

type DatabaseClient = PrismaClient | Prisma.TransactionClient;

interface LoadedArchiveRequest {
  id: string;
  requestReferenceNumber: string;
  studentId: string;
  studentFirstName: string;
  studentMiddleInitial: string | null;
  studentLastName: string;
  studentCourseProgram: string;
  studentAcademicYear: string;
  studentEmail: string;
  purposeOfRequest: string;
  officialReceiptNumber: string | null;
  paymentVerificationStatus: string;
  status: GmcRequestStatus;
  dateSubmitted: Date;
  dateReleased: Date | null;
  certificate: {
    certificateNumber: string;
    dateOfIssuance: Date;
  } | null;
}

interface ArchiveRequestRow {
  id: string;
  requestReferenceNumber: string;
  studentId: string;
  studentFullName: string;
  studentCourseProgram: string;
  studentAcademicYear: string;
  purposeOfRequest: string;
  officialReceiptNumber: string | null;
  paymentVerificationStatus: string;
  certificateNumber: string | null;
  status: GmcRequestStatus;
  dateSubmitted: string;
  dateReleased: string | null;
}

interface ArchivePagination {
  page: number;
  pageSize: number;
  totalResults: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface RecordsArchivePageData {
  requests: ArchiveRequestRow[];
  pagination: ArchivePagination;
}

export interface LoadedReportRequest {
  id: string;
  requestReferenceNumber: string;
  studentCourseProgram: string;
  status: GmcRequestStatus;
  certificate: {
    certificateNumber: string;
    dateOfIssuance: Date;
  } | null;
}

export interface RecordsArchiveReportRow {
  key: string;
  label: string;
  totalCertificates: number;
  releasedCount: number;
  generatedCount: number;
  deliveryFailedCount: number;
}

export interface RecordsArchiveReportSummary {
  totalCertificates: number;
  releasedCount: number;
  generatedCount: number;
  deliveryFailedCount: number;
  issuanceFromLabel: string;
  issuanceToLabel: string;
  breakdownLabel: string;
  statusLabel: string;
  programLabel: string;
}

export interface RecordsArchiveReportData {
  filters: RecordsArchiveReportFilters;
  summary: RecordsArchiveReportSummary;
  rows: RecordsArchiveReportRow[];
}

function fullName(
  firstName: string,
  middleInitial: string | null,
  lastName: string,
): string {
  return [firstName, middleInitial ? `${middleInitial}.` : null, lastName]
    .filter(Boolean)
    .join(" ");
}

function buildArchiveSearchWhere(search: string): Prisma.GmcRequestWhereInput {
  if (!search) {
    return {};
  }

  return {
    OR: [
      { requestReferenceNumber: { contains: search, mode: "insensitive" } },
      { studentId: { contains: search, mode: "insensitive" } },
      { studentFirstName: { contains: search, mode: "insensitive" } },
      { studentMiddleInitial: { contains: search, mode: "insensitive" } },
      { studentLastName: { contains: search, mode: "insensitive" } },
      { studentCourseProgram: { contains: search, mode: "insensitive" } },
      { studentEmail: { contains: search, mode: "insensitive" } },
      { officialReceiptNumber: { contains: search, mode: "insensitive" } },
      {
        certificate: {
          is: {
            certificateNumber: { contains: search, mode: "insensitive" },
          },
        },
      },
    ],
  };
}

function mapArchiveStatusFilter(
  status: RecordsArchiveStatusFilter,
): GmcRequestStatus | null {
  switch (status) {
    case "PENDING":
    case "APPROVED":
    case "GENERATED":
    case "RETURNED":
    case "REJECTED":
    case "RELEASED":
    case "DELIVERY_FAILED":
      return status;
    case "all":
    default:
      return null;
  }
}

function mapReportStatusFilter(
  status: RecordsArchiveReportStatusFilter,
): GmcRequestStatus[] {
  switch (status) {
    case "GENERATED":
    case "RELEASED":
    case "DELIVERY_FAILED":
      return [status];
    case "all":
    default:
      return CERTIFICATE_REPORT_STATUSES;
  }
}

function getArchiveDateRange(filters: RecordsArchiveFilters): {
  start: Date | null;
  endExclusive: Date | null;
} {
  const start = filters.from ? parseBusinessDateString(filters.from) : null;
  const end = filters.to ? parseBusinessDateString(filters.to) : null;

  if (!end) {
    return { start, endExclusive: null };
  }

  const nextToDate = new Date(end);
  nextToDate.setDate(nextToDate.getDate() + 1);

  return { start, endExclusive: nextToDate };
}

function getReportDateRange(filters: RecordsArchiveReportFilters): {
  start: Date | null;
  endExclusive: Date | null;
} {
  const start = filters.from ? parseBusinessDateString(filters.from) : null;
  const end = filters.to ? parseBusinessDateString(filters.to) : null;

  if (!end) {
    return { start, endExclusive: null };
  }

  const nextToDate = new Date(end);
  nextToDate.setDate(nextToDate.getDate() + 1);

  return { start, endExclusive: nextToDate };
}

function buildArchiveWhere(filters: RecordsArchiveFilters): Prisma.GmcRequestWhereInput {
  const statusFilter = mapArchiveStatusFilter(filters.status);
  const { start, endExclusive } = getArchiveDateRange(filters);

  return {
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(filters.program.trim()
      ? {
          studentCourseProgram: {
            contains: filters.program.trim(),
            mode: "insensitive",
          },
        }
      : {}),
    ...(start || endExclusive
      ? {
          dateSubmitted: {
            ...(start ? { gte: start } : {}),
            ...(endExclusive ? { lt: endExclusive } : {}),
          },
        }
      : {}),
    ...buildArchiveSearchWhere(filters.search.trim()),
  };
}

function buildReportWhere(filters: RecordsArchiveReportFilters): Prisma.GmcRequestWhereInput {
  const reportStatuses = mapReportStatusFilter(filters.status);
  const { start, endExclusive } = getReportDateRange(filters);
  const certificateFilter = start || endExclusive
    ? {
        is: {
          ...(start || endExclusive
            ? {
                dateOfIssuance: {
                  ...(start ? { gte: start } : {}),
                  ...(endExclusive ? { lt: endExclusive } : {}),
                },
              }
            : {}),
        },
      }
    : {
        isNot: null,
      };

  return {
    status: { in: reportStatuses },
    certificate: certificateFilter,
    ...(filters.program.trim()
      ? {
          studentCourseProgram: {
            contains: filters.program.trim(),
            mode: "insensitive",
          },
        }
      : {}),
  };
}

function buildArchiveRow(request: LoadedArchiveRequest): ArchiveRequestRow {
  return {
    id: request.id,
    requestReferenceNumber: request.requestReferenceNumber,
    studentId: request.studentId,
    studentFullName: fullName(
      request.studentFirstName,
      request.studentMiddleInitial,
      request.studentLastName,
    ),
    studentCourseProgram: request.studentCourseProgram,
    studentAcademicYear: request.studentAcademicYear,
    purposeOfRequest: formatPurposeLabel(request.purposeOfRequest),
    officialReceiptNumber: request.officialReceiptNumber,
    paymentVerificationStatus: formatPaymentVerificationLabel(
      request.paymentVerificationStatus,
    ),
    certificateNumber: request.certificate?.certificateNumber ?? null,
    status: request.status,
    dateSubmitted: formatBusinessDateTime(request.dateSubmitted),
    dateReleased: request.dateReleased ? formatBusinessDateTime(request.dateReleased) : null,
  };
}

function buildReportRow(
  key: string,
  label: string,
  initial?: Partial<RecordsArchiveReportRow>,
): RecordsArchiveReportRow {
  return {
    key,
    label,
    totalCertificates: initial?.totalCertificates ?? 0,
    releasedCount: initial?.releasedCount ?? 0,
    generatedCount: initial?.generatedCount ?? 0,
    deliveryFailedCount: initial?.deliveryFailedCount ?? 0,
  };
}

function reportGroupLabel(
  request: LoadedReportRequest,
  breakdown: RecordsArchiveBreakdown,
): { key: string; label: string } {
  if (breakdown === "PROGRAM") {
    return {
      key: request.studentCourseProgram,
      label: request.studentCourseProgram,
    };
  }

  return {
    key: request.status,
    label: formatRequestStatusLabel(request.status),
  };
}

function buildReportSummary(
  filters: RecordsArchiveReportFilters,
  rows: RecordsArchiveReportRow[],
): RecordsArchiveReportSummary {
  const totalCertificates = rows.reduce(
    (sum, row) => sum + row.totalCertificates,
    0,
  );

  const releasedCount = rows.reduce((sum, row) => sum + row.releasedCount, 0);
  const generatedCount = rows.reduce((sum, row) => sum + row.generatedCount, 0);
  const deliveryFailedCount = rows.reduce(
    (sum, row) => sum + row.deliveryFailedCount,
    0,
  );

  const issuanceFromLabel = filters.from
    ? formatBusinessDate(filters.from)
    : "Earliest";
  const issuanceToLabel = filters.to ? formatBusinessDate(filters.to) : "Latest";

  return {
    totalCertificates,
    releasedCount,
    generatedCount,
    deliveryFailedCount,
    issuanceFromLabel,
    issuanceToLabel,
    breakdownLabel:
      filters.breakdown === "PROGRAM" ? "Course / Program" : "Request Status",
    statusLabel:
      filters.status === "all" ? "All certificate statuses" : formatRequestStatusLabel(filters.status),
    programLabel: filters.program.trim() || "All programs",
  };
}

export function normalizeRecordsArchivePage(page: number): number {
  return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
}

export function getRecordsArchivePageSize(): number {
  return RECORDS_ARCHIVE_PAGE_SIZE;
}

export async function getRecordsArchivePageData(
  db: PrismaClient,
  filters: RecordsArchiveFilters,
): Promise<RecordsArchivePageData> {
  const where = buildArchiveWhere(filters);
  const pageSize = RECORDS_ARCHIVE_PAGE_SIZE;
  const requestedPage = normalizeRecordsArchivePage(filters.page);

  const totalResults = await db.gmcRequest.count({ where });
  const totalPages = totalResults > 0 ? Math.ceil(totalResults / pageSize) : 0;
  const page = totalPages > 0 ? Math.min(requestedPage, totalPages) : 1;

  const requests = await db.gmcRequest.findMany({
    where,
    orderBy: [{ dateSubmitted: "desc" }, { requestReferenceNumber: "desc" }],
    skip: totalResults > 0 ? (page - 1) * pageSize : 0,
    take: pageSize,
    select: {
      id: true,
      requestReferenceNumber: true,
      studentId: true,
      studentFirstName: true,
      studentMiddleInitial: true,
      studentLastName: true,
      studentCourseProgram: true,
      studentAcademicYear: true,
      studentEmail: true,
      purposeOfRequest: true,
      officialReceiptNumber: true,
      paymentVerificationStatus: true,
      status: true,
      dateSubmitted: true,
      dateReleased: true,
      certificate: {
        select: {
          certificateNumber: true,
          dateOfIssuance: true,
        },
      },
    },
  });

  return {
    requests: requests.map(buildArchiveRow),
    pagination: {
      page,
      pageSize,
      totalResults,
      totalPages,
      hasPreviousPage: page > 1,
      hasNextPage: page < totalPages,
    },
  };
}

export async function getRecordsArchiveReportRecords(
  db: PrismaClient,
  filters: RecordsArchiveReportFilters,
): Promise<LoadedReportRequest[]> {
  return db.gmcRequest.findMany({
    where: buildReportWhere(filters),
    orderBy: [{ certificate: { dateOfIssuance: "desc" } }, { requestReferenceNumber: "desc" }],
    select: {
      id: true,
      requestReferenceNumber: true,
      studentCourseProgram: true,
      status: true,
      certificate: {
        select: {
          certificateNumber: true,
          dateOfIssuance: true,
        },
      },
    },
  });
}

export function buildRecordsArchiveReportData(
  filters: RecordsArchiveReportFilters,
  records: LoadedReportRequest[],
): RecordsArchiveReportData {
  const grouped = new Map<string, RecordsArchiveReportRow>();

  for (const record of records) {
    if (!record.certificate) {
      continue;
    }

    const { key, label } = reportGroupLabel(record, filters.breakdown);
    const current = grouped.get(key) ?? buildReportRow(key, label);

    current.totalCertificates += 1;

    switch (record.status) {
      case "RELEASED":
        current.releasedCount += 1;
        break;
      case "GENERATED":
        current.generatedCount += 1;
        break;
      case "DELIVERY_FAILED":
        current.deliveryFailedCount += 1;
        break;
      default:
        break;
    }

    grouped.set(key, current);
  }

  const rows = Array.from(grouped.values()).sort((left, right) => {
    if (right.totalCertificates !== left.totalCertificates) {
      return right.totalCertificates - left.totalCertificates;
    }

    return left.label.localeCompare(right.label);
  });

  return {
    filters,
    summary: buildReportSummary(filters, rows),
    rows,
  };
}

export async function getRecordsArchiveReportData(
  db: PrismaClient,
  filters: RecordsArchiveReportFilters,
): Promise<RecordsArchiveReportData> {
  const records = await getRecordsArchiveReportRecords(db, filters);
  return buildRecordsArchiveReportData(filters, records);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function csvEscape(value: string | number): string {
  const text = String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

export function buildRecordsArchiveReportCsv(
  data: RecordsArchiveReportData,
): string {
  const lines = [
    `Breakdown,${csvEscape(data.summary.breakdownLabel)}`,
    `Issuance From,${csvEscape(data.summary.issuanceFromLabel)}`,
    `Issuance To,${csvEscape(data.summary.issuanceToLabel)}`,
    `Status Filter,${csvEscape(data.summary.statusLabel)}`,
    `Program Filter,${csvEscape(data.summary.programLabel)}`,
    `Total Certificates,${csvEscape(data.summary.totalCertificates)}`,
    `Released Count,${csvEscape(data.summary.releasedCount)}`,
    `Generated Count,${csvEscape(data.summary.generatedCount)}`,
    `Delivery Failed Count,${csvEscape(data.summary.deliveryFailedCount)}`,
    "",
    ["Group", "Total Certificates", "Released", "Generated", "Delivery Failed"].join(","),
    ...data.rows.map((row) =>
      [
        csvEscape(row.label),
        csvEscape(row.totalCertificates),
        csvEscape(row.releasedCount),
        csvEscape(row.generatedCount),
        csvEscape(row.deliveryFailedCount),
      ].join(","),
    ),
  ];

  return lines.join("\r\n");
}

export function buildRecordsArchiveReportHtml(
  data: RecordsArchiveReportData,
): string {
  const summaryCards = [
    {
      label: "Certificates",
      value: String(data.summary.totalCertificates),
    },
    {
      label: "Released",
      value: String(data.summary.releasedCount),
    },
    {
      label: "Generated",
      value: String(data.summary.generatedCount),
    },
    {
      label: "Delivery Failed",
      value: String(data.summary.deliveryFailedCount),
    },
  ]
    .map(
      (card) => `
        <div style="border:1px solid #dbe4f0;border-radius:18px;background:#f8fafc;padding:16px 18px;">
          <div style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#64748b;">${escapeHtml(card.label)}</div>
          <div style="margin-top:8px;font-size:24px;font-weight:700;color:#111827;">${escapeHtml(card.value)}</div>
        </div>
      `,
    )
    .join("");

  const rows = data.rows.length
    ? data.rows
        .map(
          (row) => `
            <tr>
              <td style="padding:12px 14px;border-top:1px solid #e2e8f0;">${escapeHtml(row.label)}</td>
              <td style="padding:12px 14px;border-top:1px solid #e2e8f0;text-align:right;">${row.totalCertificates}</td>
              <td style="padding:12px 14px;border-top:1px solid #e2e8f0;text-align:right;">${row.releasedCount}</td>
              <td style="padding:12px 14px;border-top:1px solid #e2e8f0;text-align:right;">${row.generatedCount}</td>
              <td style="padding:12px 14px;border-top:1px solid #e2e8f0;text-align:right;">${row.deliveryFailedCount}</td>
            </tr>
          `,
        )
        .join("")
    : `
        <tr>
          <td colspan="5" style="padding:24px 14px;text-align:center;color:#64748b;border-top:1px solid #e2e8f0;">
            No certificate issuances match the selected filters.
          </td>
        </tr>
      `;

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Records Archive Summary Report</title>
    <style>
      @page { size: A4 landscape; margin: 18mm; }
      body {
        margin: 0;
        font-family: Arial, Helvetica, sans-serif;
        color: #0f172a;
        background: #ffffff;
      }
      .sheet {
        width: 100%;
      }
      .header {
        display: flex;
        justify-content: space-between;
        gap: 24px;
        align-items: flex-start;
        border-bottom: 2px solid #e2e8f0;
        padding-bottom: 16px;
        margin-bottom: 20px;
      }
      .eyebrow {
        font-size: 11px;
        letter-spacing: 0.32em;
        text-transform: uppercase;
        color: #c2410c;
        font-weight: 700;
      }
      h1 {
        margin: 10px 0 6px;
        font-size: 26px;
      }
      .meta {
        margin: 0;
        font-size: 12px;
        line-height: 1.7;
        color: #475569;
      }
      .cards {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 12px;
        margin: 18px 0 20px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        font-size: 12px;
      }
      th {
        text-align: left;
        padding: 12px 14px;
        border-bottom: 1px solid #cbd5e1;
        text-transform: uppercase;
        letter-spacing: 0.18em;
        font-size: 10px;
        color: #475569;
      }
      .footer {
        margin-top: 18px;
        font-size: 11px;
        line-height: 1.7;
        color: #64748b;
      }
    </style>
  </head>
  <body>
    <div class="sheet">
      <div class="header">
        <div>
          <div class="eyebrow">Discipline Office</div>
          <h1>Records Archive Summary Report</h1>
          <p class="meta">
            Breakdown: ${escapeHtml(data.summary.breakdownLabel)}<br />
            Issuance range: ${escapeHtml(data.summary.issuanceFromLabel)} to ${escapeHtml(data.summary.issuanceToLabel)}<br />
            Status filter: ${escapeHtml(data.summary.statusLabel)}<br />
            Program filter: ${escapeHtml(data.summary.programLabel)}
          </p>
        </div>
      </div>

      <div class="cards">${summaryCards}</div>

      <table>
        <thead>
          <tr>
            <th>${escapeHtml(data.summary.breakdownLabel)}</th>
            <th>Total</th>
            <th>Released</th>
            <th>Generated</th>
            <th>Delivery Failed</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>

      <div class="footer">
        This export reflects the current records archive at the time of generation. Requests,
        payment proofs, generated PDFs, and audit logs are retained indefinitely. Access is
        restricted to staff users.
      </div>
    </div>
  </body>
</html>`;
}

export function buildRecordsArchiveExportFilename(
  data: RecordsArchiveReportData,
  format: "csv" | "pdf",
): string {
  const start = data.filters.from || "all";
  const end = data.filters.to || "all";
  const status = data.filters.status;
  const program =
    data.filters.program
      .trim()
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "all";
  const breakdown = data.filters.breakdown.toLowerCase();

  return `gmc-records-archive-${breakdown}-${status}-${program || "all"}-${start}-${end}.${format}`;
}

export async function renderRecordsArchiveReportPdf(
  data: RecordsArchiveReportData,
): Promise<Buffer> {
  return renderHtmlToPdfBuffer(buildRecordsArchiveReportHtml(data));
}

export async function logRecordsArchiveExportAuditEntries(
  db: DatabaseClient,
  input: {
    actorId: string | null;
    format: "csv" | "pdf";
    filters: RecordsArchiveReportFilters;
    requestIds: string[];
  },
): Promise<void> {
  if (input.requestIds.length === 0) {
    return;
  }

  const action =
    input.format === "csv"
      ? "RECORDS_ARCHIVE_EXPORTED_CSV"
      : "RECORDS_ARCHIVE_EXPORTED_PDF";
  const notes = [
    `Records archive export generated as ${input.format.toUpperCase()}.`,
    `Breakdown: ${input.filters.breakdown === "PROGRAM" ? "Course / Program" : "Request Status"}.`,
    `Issuance range: ${input.filters.from || "Earliest"} to ${input.filters.to || "Latest"}.`,
    `Status filter: ${
      input.filters.status === "all"
        ? "All certificate statuses"
        : formatRequestStatusLabel(input.filters.status)
    }.`,
    `Program filter: ${input.filters.program.trim() || "All programs"}.`,
  ].join(" ");

  await db.auditLogEntry.createMany({
    data: input.requestIds.map((requestId) => ({
      gmcRequestId: requestId,
      actorId: input.actorId,
      action,
      notes,
    })),
  });
}

export function getRecordsArchiveCertificateReportStatusOptions(): readonly RecordsArchiveReportStatusFilter[] {
  return RECORDS_ARCHIVE_REPORT_STATUSES;
}

export function getRecordsArchiveBreakdownOptions(): readonly RecordsArchiveBreakdown[] {
  return RECORDS_ARCHIVE_BREAKDOWNS;
}
