import type { GmcRequestStatus, Prisma, PrismaClient } from "@prisma/client";
import { getBusinessDayRange, getBusinessMonthRange } from "@/lib/business-time";

const DASHBOARD_PAGE_SIZE = 5;

export const STAFF_REQUEST_STATUSES = [
  "all",
  "PENDING",
  "APPROVED",
  "GENERATED",
  "RETURNED",
  "REJECTED",
  "RELEASED",
  "DELIVERY_FAILED",
] as const;

export type StaffRequestStatusFilter = (typeof STAFF_REQUEST_STATUSES)[number];

export interface StaffDashboardFilters {
  search: string;
  status: StaffRequestStatusFilter;
  from: string;
  to: string;
  page: number;
}

export interface StaffDashboardRequestRow {
  id: string;
  requestReferenceNumber: string;
  studentId: string;
  studentFirstName: string;
  studentMiddleInitial: string | null;
  studentLastName: string;
  studentCourseProgram: string;
  purposeOfRequest: string;
  status: GmcRequestStatus;
  dateSubmitted: Date;
  certificate: {
    certificateNumber: string;
    generatedPdfUrl: string | null;
  } | null;
}

export interface StaffDashboardData {
  summary: {
    totalRequests: number;
    pendingRequests: number;
    approvedToday: number;
    releasedThisMonth: number;
  };
  requests: StaffDashboardRequestRow[];
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
    ],
  };
}

function mapStatusFilter(status: StaffRequestStatusFilter): GmcRequestStatus | null {
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

export function normalizeDashboardPage(page: number): number {
  return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
}

export function getDashboardPageSize(): number {
  return DASHBOARD_PAGE_SIZE;
}

export async function getStaffDashboardData(
  db: PrismaClient,
  filters: StaffDashboardFilters,
): Promise<StaffDashboardData> {
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
          dateSubmitted: {
            ...(fromDate ? { gte: fromDate } : {}),
            ...(nextToDate ? { lt: nextToDate } : {}),
          },
        }
      : {}),
    ...buildSearchWhere(search),
  };

  const pageSize = DASHBOARD_PAGE_SIZE;
  const requestedPage = normalizeDashboardPage(filters.page);

  const [
    totalRequests,
    pendingRequests,
    approvedToday,
    releasedThisMonth,
    totalResults,
  ] = await Promise.all([
    db.gmcRequest.count(),
    db.gmcRequest.count({ where: { status: "PENDING" } }),
    db.auditLogEntry.count({
      where: {
        action: "REQUEST_APPROVED",
        timestamp: {
          gte: businessDayRange.start,
          lt: businessDayRange.endExclusive,
        },
      },
    }),
    db.gmcRequest.count({
      where: {
        status: "RELEASED",
        dateReleased: {
          gte: businessMonthRange.start,
          lt: businessMonthRange.endExclusive,
        },
      },
    }),
    db.gmcRequest.count({ where }),
  ]);

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
      purposeOfRequest: true,
      status: true,
      dateSubmitted: true,
      certificate: {
        select: {
          certificateNumber: true,
          generatedPdfUrl: true,
        },
      },
    },
  });

  return {
    summary: {
      totalRequests,
      pendingRequests,
      approvedToday,
      releasedThisMonth,
    },
    requests,
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
