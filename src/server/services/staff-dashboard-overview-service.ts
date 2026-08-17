import type { GmcRequestStatus, PrismaClient, PurposeOfRequest } from "@prisma/client";
import {
  addBusinessDays,
  getBusinessDayRange,
  getBusinessDateString,
  getBusinessMonthRange,
  parseBusinessDateString,
} from "@/lib/business-time";
import { formatPurposeLabel } from "@/lib/gmc-request";
import {
  getStaffDashboardData,
  type StaffDashboardData,
  type StaffDashboardFilters,
} from "./staff-dashboard-service";

const STAT_TREND_DAYS = 14;
const SLA_TARGET_BUSINESS_DAYS = 3;
const ACTIVITY_LIMIT = 12;
const OVERDUE_LIMIT = 5;

type DatabaseClient = PrismaClient;

interface DateRange {
  start: Date;
  endExclusive: Date;
}

export interface StaffDashboardOverviewMetric {
  key: "totalRequests" | "pendingRequests" | "approvedToday" | "releasedThisMonth";
  label: string;
  value: number;
  comparisonLabel: string;
  percentChange: number;
  trend: number[];
  trendLabels: string[];
  accent: "blue" | "gold" | "teal" | "orange";
}

export interface StaffDashboardStatusBreakdownItem {
  status: GmcRequestStatus;
  label: string;
  count: number;
  percentage: number;
  color: string;
}

export interface StaffDashboardPurposeBreakdownItem {
  purpose: PurposeOfRequest;
  label: string;
  count: number;
  percentage: number;
}

export interface StaffDashboardSlaOverdueRequest {
  id: string;
  requestReferenceNumber: string;
  studentName: string;
  dateSubmitted: string;
  businessDaysWaiting: number;
}

export interface StaffDashboardSlaData {
  targetBusinessDays: number;
  averageReleaseBusinessDays: number | null;
  progressPercent: number;
  overdueCount: number;
  overdueRequests: StaffDashboardSlaOverdueRequest[];
}

export interface StaffDashboardActivityItem {
  id: string;
  action: string;
  actionLabel: string;
  actorName: string;
  targetLabel: string;
  notes: string | null;
  relativeTime: string;
  timestamp: string;
}

export interface StaffDashboardPurposeWidgetData {
  from: string;
  to: string;
  totalRequests: number;
  items: StaffDashboardPurposeBreakdownItem[];
}

export interface StaffDashboardOverviewData extends StaffDashboardData {
  metrics: StaffDashboardOverviewMetric[];
  statusBreakdown: StaffDashboardStatusBreakdownItem[];
  purposeBreakdown: StaffDashboardPurposeWidgetData;
  sla: StaffDashboardSlaData;
  activity: StaffDashboardActivityItem[];
}

interface DateCountRow {
  date: Date;
}

interface AuditLogRow {
  id: string;
  action: string;
  notes: string | null;
  timestamp: Date;
  actor: {
    name: string;
  } | null;
  gmcRequest: {
    requestReferenceNumber: string;
  } | null;
}

const STATUS_COLORS: Record<GmcRequestStatus, string> = {
  PENDING: "#E0B50F",
  APPROVED: "#34B1AA",
  GENERATED: "#3B8FF3",
  REJECTED: "#E05252",
  RETURNED: "#8A94A6",
  RELEASED: "#2C4368",
  DELIVERY_FAILED: "#F29F67",
};

const ACTIVITY_LABELS: Record<string, string> = {
  REQUEST_SUBMITTED: "Request submitted",
  REQUEST_APPROVED: "Request approved",
  REQUEST_GENERATED: "Certificate generated",
  REQUEST_REJECTED: "Request rejected",
  REQUEST_RETURNED: "Request returned",
  REQUEST_RELEASED: "Request released",
  REQUEST_DELIVERY_FAILED: "Delivery failed",
  CERTIFICATE_RELEASED_AND_EMAILED: "Certificate released and emailed",
  CERTIFICATE_RELEASED_EMAIL_NOT_SENT: "Certificate released, email not sent",
  CERTIFICATE_DELIVERY_FAILED: "Certificate delivery failed",
  CERTIFICATE_EDITED_BEFORE_APPROVAL: "Certificate edited before approval",
  PASSWORD_CHANGED: "Password changed",
  STAFF_USER_CREATED: "Staff user created",
  STAFF_USER_DEACTIVATED: "Staff user deactivated",
  STAFF_USER_REACTIVATED: "Staff user reactivated",
  STAFF_USER_ROLE_UPDATED: "Staff user role updated",
  RECORDS_ARCHIVE_EXPORTED_CSV: "Records archive exported",
  RECORDS_ARCHIVE_EXPORTED_PDF: "Records archive exported",
};

function getBusinessDateParts(date: Date = new Date()): {
  year: number;
  month: number;
  day: number;
} {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  return {
    year: Number(parts.find((part) => part.type === "year")?.value ?? "0"),
    month: Number(parts.find((part) => part.type === "month")?.value ?? "0"),
    day: Number(parts.find((part) => part.type === "day")?.value ?? "0"),
  };
}

function getBusinessMonthEquivalentPreviousRange(referenceDate: Date = new Date()): DateRange {
  const { year, month, day } = getBusinessDateParts(referenceDate);
  const previousMonthStart = new Date(Date.UTC(year, month - 2, 1));
  const previousMonthStartString = getBusinessDateString(previousMonthStart);
  const start = parseBusinessDateString(previousMonthStartString);
  const endExclusive = parseBusinessDateString(addBusinessDays(previousMonthStartString, day));

  return { start, endExclusive };
}

function getRollingRange(days: number, referenceDate: Date = new Date()): DateRange {
  const todayString = getBusinessDateString(referenceDate);
  return {
    start: parseBusinessDateString(addBusinessDays(todayString, -(days - 1))),
    endExclusive: parseBusinessDateString(addBusinessDays(todayString, 1)),
  };
}

function getPreviousRollingRange(days: number, referenceDate: Date = new Date()): DateRange {
  const todayString = getBusinessDateString(referenceDate);
  return {
    start: parseBusinessDateString(addBusinessDays(todayString, -(days * 2 - 1))),
    endExclusive: parseBusinessDateString(addBusinessDays(todayString, -(days - 1))),
  };
}

function getDateSequence(start: Date, endExclusive: Date): string[] {
  const sequence: string[] = [];
  let cursor = getBusinessDateString(start);
  const endInclusive = getBusinessDateString(new Date(endExclusive.getTime() - 1));

  while (cursor <= endInclusive) {
    sequence.push(cursor);
    cursor = addBusinessDays(cursor, 1);
  }

  return sequence;
}

function buildTrendSeries(rows: DateCountRow[], start: Date, endExclusive: Date): number[] {
  const counts = new Map<string, number>();

  for (const row of rows) {
    const key = getBusinessDateString(row.date);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return getDateSequence(start, endExclusive).map((dateString) => counts.get(dateString) ?? 0);
}

function calculatePercentChange(current: number, previous: number): number {
  if (previous === 0) {
    return current === 0 ? 0 : 100;
  }

  return Math.round(((current - previous) / previous) * 100);
}

function formatRelativeTime(timestamp: Date, now: Date = new Date()): string {
  const diffMs = now.getTime() - timestamp.getTime();
  const diffMinutes = Math.max(Math.floor(diffMs / 60_000), 0);

  if (diffMinutes < 1) {
    return "just now";
  }

  if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
}

function businessDayDifference(start: Date, end: Date = new Date()): number {
  const current = parseBusinessDateString(getBusinessDateString(start));
  const target = parseBusinessDateString(getBusinessDateString(end));
  let count = 0;

  while (current < target) {
    current.setUTCDate(current.getUTCDate() + 1);
    const day = current.getUTCDay();
    if (day !== 0 && day !== 6) {
      count += 1;
    }
  }

  return count;
}

function fullName(firstName: string, middleInitial: string | null, lastName: string): string {
  return [firstName, middleInitial ? `${middleInitial}.` : null, lastName]
    .filter(Boolean)
    .join(" ");
}

function actionLabel(action: string): string {
  return ACTIVITY_LABELS[action] ?? action.replaceAll("_", " ").toLowerCase();
}

function targetLabel(entry: AuditLogRow): string {
  if (entry.gmcRequest?.requestReferenceNumber) {
    return `Request ${entry.gmcRequest.requestReferenceNumber}`;
  }

  if (entry.action.startsWith("STAFF_USER_") || entry.action === "PASSWORD_CHANGED") {
    return "Staff account";
  }

  if (entry.action.startsWith("RECORDS_ARCHIVE_EXPORTED")) {
    return "Records archive";
  }

  return "System";
}

async function loadSubmittedRows(
  db: DatabaseClient,
  where: DateRange,
  extraWhere: Record<string, unknown> = {},
): Promise<DateCountRow[]> {
  const rows = await db.gmcRequest.findMany({
    where: {
      dateSubmitted: {
        gte: where.start,
        lt: where.endExclusive,
      },
      ...(extraWhere as object),
    },
    select: {
      dateSubmitted: true,
    },
  });

  return rows.map((row) => ({ date: row.dateSubmitted }));
}

async function loadReleasedRows(
  db: DatabaseClient,
  where: DateRange,
): Promise<DateCountRow[]> {
  const rows = await db.gmcRequest.findMany({
    where: {
      status: "RELEASED",
      dateReleased: {
        gte: where.start,
        lt: where.endExclusive,
      },
    },
    select: {
      dateReleased: true,
    },
  });

  return rows
    .map((row) => ({ date: row.dateReleased }))
    .filter((row): row is DateCountRow => row.date instanceof Date);
}

async function loadApprovalRows(
  db: DatabaseClient,
  where: DateRange,
): Promise<DateCountRow[]> {
  const rows = await db.auditLogEntry.findMany({
    where: {
      action: "REQUEST_APPROVED",
      timestamp: { gte: where.start, lt: where.endExclusive },
    },
    select: {
      timestamp: true,
    },
  });

  return rows.map((row) => ({ date: row.timestamp }));
}

async function loadAuditRows(
  db: DatabaseClient,
  where: { gte: Date; lt: Date },
  actions: string[],
): Promise<AuditLogRow[]> {
  return db.auditLogEntry.findMany({
    where: {
      action: { in: actions },
      timestamp: { gte: where.gte, lt: where.lt },
    },
    orderBy: [{ timestamp: "desc" }, { id: "desc" }],
    take: 200,
    select: {
      id: true,
      action: true,
      notes: true,
      timestamp: true,
      actor: {
        select: {
          name: true,
        },
      },
      gmcRequest: {
        select: {
          requestReferenceNumber: true,
        },
      },
    },
  });
}

async function buildStatusBreakdown(
  db: DatabaseClient,
): Promise<StaffDashboardStatusBreakdownItem[]> {
  const grouped = await db.gmcRequest.groupBy({
    by: ["status"],
    _count: { _all: true },
  });

  const total = grouped.reduce((sum, item) => sum + item._count._all, 0);
  const order: GmcRequestStatus[] = [
    "PENDING",
    "APPROVED",
    "GENERATED",
    "RETURNED",
    "REJECTED",
    "RELEASED",
    "DELIVERY_FAILED",
  ];

  return order.map((status) => {
    const count = grouped.find((item) => item.status === status)?._count._all ?? 0;
    return {
      status,
      label: status
        .toLowerCase()
        .replaceAll("_", " ")
        .replace(/\b\w/g, (character) => character.toUpperCase()),
      count,
      percentage: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
      color: STATUS_COLORS[status],
    };
  });
}

async function buildPurposeBreakdown(
  db: DatabaseClient,
  filters: { purposeFrom: string; purposeTo: string },
): Promise<StaffDashboardPurposeWidgetData> {
  const from = filters.purposeFrom ? parseBusinessDateString(filters.purposeFrom) : null;
  const to = filters.purposeTo ? parseBusinessDateString(filters.purposeTo) : null;
  const endExclusive = to ? new Date(to) : null;

  if (endExclusive) {
    endExclusive.setDate(endExclusive.getDate() + 1);
  }

  const where = {
    ...(from ? { dateSubmitted: { gte: from, ...(endExclusive ? { lt: endExclusive } : {}) } } : endExclusive ? { dateSubmitted: { lt: endExclusive } } : {}),
  };

  const grouped = await db.gmcRequest.groupBy({
    by: ["purposeOfRequest"],
    where,
    _count: { _all: true },
  });

  const totalRequests = grouped.reduce((sum, item) => sum + item._count._all, 0);
  const order: PurposeOfRequest[] = [
    "TRANSFER_OUT",
    "EMPLOYMENT",
    "SCHOLARSHIP",
    "INTERNSHIP",
    "BOARD_EXAM",
    "OTHER",
  ];

  return {
    from: filters.purposeFrom,
    to: filters.purposeTo,
    totalRequests,
    items: order.map((purpose) => {
      const count = grouped.find((item) => item.purposeOfRequest === purpose)?._count._all ?? 0;
      return {
        purpose,
        label: formatPurposeLabel(purpose),
        count,
        percentage: totalRequests > 0 ? Math.round((count / totalRequests) * 1000) / 10 : 0,
      };
    }),
  };
}

async function buildSlaData(db: DatabaseClient): Promise<StaffDashboardSlaData> {
  const [releasedRequests, pendingRequests] = await Promise.all([
    db.gmcRequest.findMany({
      where: { status: "RELEASED", dateReleased: { not: null } },
      select: { dateSubmitted: true, dateReleased: true },
    }),
    db.gmcRequest.findMany({
      where: { status: "PENDING" },
      select: {
        id: true,
        requestReferenceNumber: true,
        studentFirstName: true,
        studentMiddleInitial: true,
        studentLastName: true,
        dateSubmitted: true,
      },
      orderBy: [{ dateSubmitted: "asc" }, { requestReferenceNumber: "asc" }],
    }),
  ]);

  const releaseDurations = releasedRequests
    .map((request) => {
      if (!request.dateReleased) {
        return null;
      }
      return businessDayDifference(request.dateSubmitted, request.dateReleased);
    })
    .filter((value): value is number => value !== null);

  const averageReleaseBusinessDays =
    releaseDurations.length > 0
      ? Math.round(
          (releaseDurations.reduce((sum, value) => sum + value, 0) /
            releaseDurations.length) *
            10,
        ) / 10
      : null;

  const overdueRequests = pendingRequests
    .map((request) => ({
      id: request.id,
      requestReferenceNumber: request.requestReferenceNumber,
      studentName: fullName(
        request.studentFirstName,
        request.studentMiddleInitial,
        request.studentLastName,
      ),
      dateSubmitted: request.dateSubmitted,
      businessDaysWaiting: businessDayDifference(request.dateSubmitted, new Date()),
    }))
    .filter((request) => request.businessDaysWaiting > SLA_TARGET_BUSINESS_DAYS)
    .slice(0, OVERDUE_LIMIT);

  const overdueCount = pendingRequests.filter(
    (request) => businessDayDifference(request.dateSubmitted, new Date()) > SLA_TARGET_BUSINESS_DAYS,
  ).length;

  const progressPercent =
    averageReleaseBusinessDays !== null
      ? Math.max(0, Math.min(100, (SLA_TARGET_BUSINESS_DAYS / Math.max(averageReleaseBusinessDays, 0.1)) * 100))
      : 0;

  return {
    targetBusinessDays: SLA_TARGET_BUSINESS_DAYS,
    averageReleaseBusinessDays,
    progressPercent: Math.round(progressPercent * 10) / 10,
    overdueCount,
    overdueRequests: overdueRequests.map((request) => ({
      ...request,
      dateSubmitted: getBusinessDateString(request.dateSubmitted),
    })),
  };
}

async function buildActivityFeed(db: DatabaseClient): Promise<StaffDashboardActivityItem[]> {
  const activityRows = await loadAuditRows(
    db,
    {
      gte: getBusinessMonthRange().start,
      lt: getBusinessMonthRange().endExclusive,
    },
    [
      "REQUEST_SUBMITTED",
      "REQUEST_APPROVED",
      "REQUEST_GENERATED",
      "REQUEST_REJECTED",
      "REQUEST_RETURNED",
      "REQUEST_RELEASED",
      "REQUEST_DELIVERY_FAILED",
      "CERTIFICATE_RELEASED_AND_EMAILED",
      "CERTIFICATE_DELIVERY_FAILED",
      "CERTIFICATE_EDITED_BEFORE_APPROVAL",
      "PASSWORD_CHANGED",
      "STAFF_USER_CREATED",
      "STAFF_USER_DEACTIVATED",
      "STAFF_USER_REACTIVATED",
      "STAFF_USER_ROLE_UPDATED",
      "RECORDS_ARCHIVE_EXPORTED_CSV",
      "RECORDS_ARCHIVE_EXPORTED_PDF",
    ],
  );

  return activityRows.slice(0, ACTIVITY_LIMIT).map((entry) => ({
    id: entry.id,
    action: entry.action,
    actionLabel: actionLabel(entry.action),
    actorName: entry.actor?.name ?? "System",
    targetLabel: targetLabel(entry),
    notes: entry.notes,
    relativeTime: formatRelativeTime(entry.timestamp),
    timestamp: entry.timestamp.toISOString(),
  }));
}

async function buildMetricCards(db: DatabaseClient): Promise<StaffDashboardOverviewMetric[]> {
  const todayRange = getBusinessDayRange();
  const last7Range = getRollingRange(7);
  const prev7Range = getPreviousRollingRange(7);
  const last14Range = getRollingRange(STAT_TREND_DAYS);
  const prev14Range = getPreviousRollingRange(STAT_TREND_DAYS);
  const currentMonthRange = getBusinessMonthRange();
  const previousMonthEquivalentRange = getBusinessMonthEquivalentPreviousRange();
  const previousMonthCountRows = await loadReleasedRows(db, previousMonthEquivalentRange);

  const [
    totalRequests,
    pendingRequests,
    approvedToday,
    releasedThisMonth,
    totalRowsCurrent,
    totalRowsPrevious,
    pendingRowsCurrent,
    pendingRowsPrevious,
    approvalTrendRows,
    approvalsCurrent,
    approvalsPrevious,
  ] = await Promise.all([
    db.gmcRequest.count(),
    db.gmcRequest.count({ where: { status: "PENDING" } }),
    db.auditLogEntry.count({
      where: {
        action: "REQUEST_APPROVED",
        timestamp: { gte: todayRange.start, lt: todayRange.endExclusive },
      },
    }),
    db.gmcRequest.count({
      where: {
        status: "RELEASED",
        dateReleased: { gte: currentMonthRange.start, lt: currentMonthRange.endExclusive },
      },
    }),
    loadSubmittedRows(db, last14Range),
    loadSubmittedRows(db, prev14Range),
    loadSubmittedRows(db, last14Range, { status: "PENDING" }),
    loadSubmittedRows(db, prev14Range, { status: "PENDING" }),
    loadApprovalRows(db, last14Range),
    loadApprovalRows(db, last7Range),
    loadApprovalRows(db, prev7Range),
  ]);

  const currentMonthReleasedRows = await loadReleasedRows(db, currentMonthRange);
  const previousMonthReleasedRows = previousMonthCountRows;

  const metrics: StaffDashboardOverviewMetric[] = [
    {
      key: "totalRequests",
      label: "Total Requests",
      value: totalRequests,
      comparisonLabel: "vs prior 14 days",
      percentChange: calculatePercentChange(
        totalRowsCurrent.length,
        totalRowsPrevious.length,
      ),
      trend: buildTrendSeries(totalRowsCurrent, last14Range.start, last14Range.endExclusive),
      trendLabels: getDateSequence(last14Range.start, last14Range.endExclusive),
      accent: "blue",
    },
    {
      key: "pendingRequests",
      label: "Pending",
      value: pendingRequests,
      comparisonLabel: "vs prior 14 days",
      percentChange: calculatePercentChange(
        pendingRowsCurrent.length,
        pendingRowsPrevious.length,
      ),
      trend: buildTrendSeries(pendingRowsCurrent, last14Range.start, last14Range.endExclusive),
      trendLabels: getDateSequence(last14Range.start, last14Range.endExclusive),
      accent: "gold",
    },
    {
      key: "approvedToday",
      label: "Approved Today",
      value: approvedToday,
      comparisonLabel: "vs prior 7 days",
      percentChange: calculatePercentChange(
        approvalsCurrent.length,
        approvalsPrevious.length,
      ),
      trend: buildTrendSeries(
        approvalTrendRows,
        last14Range.start,
        last14Range.endExclusive,
      ),
      trendLabels: getDateSequence(last14Range.start, last14Range.endExclusive),
      accent: "teal",
    },
    {
      key: "releasedThisMonth",
      label: "Released This Month",
      value: releasedThisMonth,
      comparisonLabel: "vs previous month-to-date",
      percentChange: calculatePercentChange(
        currentMonthReleasedRows.length,
        previousMonthReleasedRows.length,
      ),
      trend: buildTrendSeries(
        currentMonthReleasedRows,
        currentMonthRange.start,
        currentMonthRange.endExclusive,
      ),
      trendLabels: getDateSequence(currentMonthRange.start, currentMonthRange.endExclusive),
      accent: "orange",
    },
  ];

  return metrics;
}

export async function getStaffDashboardOverviewData(
  db: DatabaseClient,
  filters: StaffDashboardFilters & { purposeFrom: string; purposeTo: string },
): Promise<StaffDashboardOverviewData> {
  const baseData = await getStaffDashboardData(db, filters);
  const [metrics, statusBreakdown, purposeBreakdown, sla, activity] = await Promise.all([
    buildMetricCards(db),
    buildStatusBreakdown(db),
    buildPurposeBreakdown(db, {
      purposeFrom: filters.purposeFrom,
      purposeTo: filters.purposeTo,
    }),
    buildSlaData(db),
    buildActivityFeed(db),
  ]);

  return {
    ...baseData,
    metrics,
    statusBreakdown,
    purposeBreakdown,
    sla,
    activity,
  };
}
