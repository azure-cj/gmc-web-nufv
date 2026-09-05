import type { GmcRequestStatus, Prisma, PrismaClient } from "@prisma/client";
import { getBusinessDayRange, getBusinessMonthRange } from "@/lib/business-time";
import type {
  StaffDashboardFilters,
  StaffRequestStatusFilter,
} from "./staff-dashboard-service";

const ISSUED_PAGE_SIZE = 10;

export interface IssuedCertificateRow {
  id: string;
  requestReferenceNumber: string;
  studentId: string;
  studentFirstName: string;
  studentMiddleInitial: string | null;
  studentLastName: string;
  studentCourseProgram: string;
  studentEmail: string;
  purposeOfRequest: string;
  status: GmcRequestStatus;
  dateSubmitted: Date;
  dateReleased: Date | null;
  certificate: {
    id: string;
    certificateNumber: string;
    dateOfIssuance: Date;
    generatedPdfUrl: string | null;
    authorizedSignatory: string;
    officeDesignation: string;
  } | null;
  pdfStatus: "AVAILABLE" | "PURGED" | "NOT_GENERATED";
}

export interface IssuedCertificatesData {
  summary: {
    totalIssued: number;
    issuedThisMonth: number;
    issuedToday: number;
    activeInStorage: number;
    onDemandPurged: number;
  };
  certificates: IssuedCertificateRow[];
  pagination: {
    page: number;
    pageSize: number;
    totalResults: number;
    totalPages: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
  };
}

function buildSearchWhere(search: string): Prisma.GmcRequestWhereInput {
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

function mapStatusFilter(status: StaffRequestStatusFilter): GmcRequestStatus | null {
  switch (status) {
    case "PENDING":
    case "REJECTED":
    case "RELEASED":
      return status;
    case "all":
    default:
      return null;
  }
}

export function normalizeIssuedPage(page: number): number {
  return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
}

export async function getIssuedCertificatesData(
  db: PrismaClient,
  filters: StaffDashboardFilters,
): Promise<IssuedCertificatesData> {
  const search = filters.search.trim();
  const statusFilter = mapStatusFilter(filters.status);
  const fromDate = filters.from ? new Date(`${filters.from}T00:00:00+08:00`) : null;
  const toDate = filters.to ? new Date(`${filters.to}T00:00:00+08:00`) : null;
  const nextToDate = toDate ? new Date(toDate) : null;
  const businessDayRange = getBusinessDayRange();
  const businessMonthRange = getBusinessMonthRange();

  if (nextToDate) {
    nextToDate.setDate(nextToDate.getDate() + 1);
  }

  const where: Prisma.GmcRequestWhereInput = {
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(fromDate || nextToDate
      ? {
          OR: [
            {
              dateReleased: {
                ...(fromDate ? { gte: fromDate } : {}),
                ...(nextToDate ? { lt: nextToDate } : {}),
              },
            },
            {
              dateReleased: null,
              dateSubmitted: {
                ...(fromDate ? { gte: fromDate } : {}),
                ...(nextToDate ? { lt: nextToDate } : {}),
              },
            },
          ],
        }
      : {}),
    ...buildSearchWhere(search),
  };

  const pageSize = ISSUED_PAGE_SIZE;
  const requestedPage = normalizeIssuedPage(filters.page);

  const [
    totalIssued,
    issuedThisMonth,
    issuedToday,
    totalResults,
    purgedCount,
  ] = await Promise.all([
    db.gmcRequest.count({
      where: {
        status: "RELEASED",
        certificate: { isNot: null },
      },
    }),
    db.gmcRequest.count({
      where: {
        status: "RELEASED",
        certificate: { isNot: null },
        dateReleased: {
          gte: businessMonthRange.start,
          lt: businessMonthRange.endExclusive,
        },
      },
    }),
    db.gmcRequest.count({
      where: {
        status: "RELEASED",
        certificate: { isNot: null },
        dateReleased: {
          gte: businessDayRange.start,
          lt: businessDayRange.endExclusive,
        },
      },
    }),
    db.gmcRequest.count({ where }),
    db.auditLogEntry.count({
      where: {
        action: "CERTIFICATE_PDF_PURGED",
      },
    }),
  ]);

  const totalPages = totalResults > 0 ? Math.ceil(totalResults / pageSize) : 0;
  const page = totalPages > 0 ? Math.min(requestedPage, totalPages) : 1;

  const rawRequests = await db.gmcRequest.findMany({
    where,
    orderBy: [
      { dateReleased: "desc" },
      { dateSubmitted: "desc" },
      { requestReferenceNumber: "desc" },
    ],
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
      studentEmail: true,
      purposeOfRequest: true,
      status: true,
      dateSubmitted: true,
      dateReleased: true,
      certificate: {
        select: {
          id: true,
          certificateNumber: true,
          dateOfIssuance: true,
          generatedPdfUrl: true,
          authorizedSignatory: true,
          officeDesignation: true,
        },
      },
      auditLogs: {
        where: {
          action: {
            in: [
              "CERTIFICATE_PDF_PURGED",
              "CERTIFICATE_PDF_REGENERATED_ON_DEMAND",
            ],
          },
        },
        orderBy: { timestamp: "desc" },
        take: 1,
        select: {
          action: true,
        },
      },
    },
  });

  const certificates: IssuedCertificateRow[] = rawRequests.map((req) => {
    let pdfStatus: "AVAILABLE" | "PURGED" | "NOT_GENERATED" = "NOT_GENERATED";

    if (req.certificate) {
      const latestAuditAction = req.auditLogs[0]?.action;
      if (latestAuditAction === "CERTIFICATE_PDF_PURGED") {
        pdfStatus = "PURGED";
      } else if (req.certificate.generatedPdfUrl) {
        pdfStatus = "AVAILABLE";
      } else {
        pdfStatus = "PURGED";
      }
    }

    return {
      id: req.id,
      requestReferenceNumber: req.requestReferenceNumber,
      studentId: req.studentId,
      studentFirstName: req.studentFirstName,
      studentMiddleInitial: req.studentMiddleInitial,
      studentLastName: req.studentLastName,
      studentCourseProgram: req.studentCourseProgram,
      studentEmail: req.studentEmail,
      purposeOfRequest: req.purposeOfRequest,
      status: req.status,
      dateSubmitted: req.dateSubmitted,
      dateReleased: req.dateReleased,
      certificate: req.certificate,
      pdfStatus,
    };
  });

  const activeInStorage = Math.max(0, totalIssued - purgedCount);

  return {
    summary: {
      totalIssued,
      issuedThisMonth,
      issuedToday,
      activeInStorage,
      onDemandPurged: purgedCount,
    },
    certificates,
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
