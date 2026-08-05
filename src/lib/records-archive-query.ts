type SearchParamValue = string | string[] | undefined;

export const RECORDS_ARCHIVE_STATUSES = [
  "all",
  "PENDING",
  "APPROVED",
  "GENERATED",
  "RETURNED",
  "REJECTED",
  "RELEASED",
  "DELIVERY_FAILED",
] as const;

export const RECORDS_ARCHIVE_REPORT_STATUSES = [
  "all",
  "GENERATED",
  "RELEASED",
  "DELIVERY_FAILED",
] as const;

export const RECORDS_ARCHIVE_BREAKDOWNS = ["STATUS", "PROGRAM"] as const;

export type RecordsArchiveStatusFilter =
  (typeof RECORDS_ARCHIVE_STATUSES)[number];

export type RecordsArchiveReportStatusFilter =
  (typeof RECORDS_ARCHIVE_REPORT_STATUSES)[number];

export type RecordsArchiveBreakdown = (typeof RECORDS_ARCHIVE_BREAKDOWNS)[number];

export interface RecordsArchiveFilters {
  search: string;
  status: RecordsArchiveStatusFilter;
  from: string;
  to: string;
  program: string;
  page: number;
}

export interface RecordsArchiveReportFilters {
  status: RecordsArchiveReportStatusFilter;
  from: string;
  to: string;
  program: string;
  breakdown: RecordsArchiveBreakdown;
}

export interface RecordsArchiveSearchParams {
  search?: SearchParamValue;
  status?: SearchParamValue;
  from?: SearchParamValue;
  to?: SearchParamValue;
  program?: SearchParamValue;
  page?: SearchParamValue;
  reportStatus?: SearchParamValue;
  reportFrom?: SearchParamValue;
  reportTo?: SearchParamValue;
  reportProgram?: SearchParamValue;
  breakdown?: SearchParamValue;
}

function firstSearchParam(value: SearchParamValue): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function normalizePage(value: number): number {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 1;
}

function isArchiveStatus(value: string): value is RecordsArchiveStatusFilter {
  return RECORDS_ARCHIVE_STATUSES.includes(value as RecordsArchiveStatusFilter);
}

function isReportStatus(value: string): value is RecordsArchiveReportStatusFilter {
  return RECORDS_ARCHIVE_REPORT_STATUSES.includes(
    value as RecordsArchiveReportStatusFilter,
  );
}

function isBreakdown(value: string): value is RecordsArchiveBreakdown {
  return RECORDS_ARCHIVE_BREAKDOWNS.includes(value as RecordsArchiveBreakdown);
}

function appendIfPresent(
  query: URLSearchParams,
  key: string,
  value: string | number,
): void {
  if (typeof value === "number") {
    if (value > 0) {
      query.set(key, String(value));
    }
    return;
  }

  const trimmed = value.trim();
  if (trimmed) {
    query.set(key, trimmed);
  }
}

export function parseRecordsArchiveFilters(
  searchParams: RecordsArchiveSearchParams,
): RecordsArchiveFilters {
  const status = firstSearchParam(searchParams.status);

  return {
    search: firstSearchParam(searchParams.search),
    status: isArchiveStatus(status) ? status : "all",
    from: firstSearchParam(searchParams.from),
    to: firstSearchParam(searchParams.to),
    program: firstSearchParam(searchParams.program),
    page: normalizePage(Number(firstSearchParam(searchParams.page) || 1)),
  };
}

export function parseRecordsArchiveReportFilters(
  searchParams: RecordsArchiveSearchParams,
): RecordsArchiveReportFilters {
  const status = firstSearchParam(searchParams.reportStatus);
  const breakdown = firstSearchParam(searchParams.breakdown);

  return {
    status: isReportStatus(status) ? status : "all",
    from: firstSearchParam(searchParams.reportFrom),
    to: firstSearchParam(searchParams.reportTo),
    program: firstSearchParam(searchParams.reportProgram),
    breakdown: isBreakdown(breakdown) ? breakdown : "STATUS",
  };
}

export function buildRecordsArchiveUrl(
  basePath: string,
  filters: RecordsArchiveFilters,
  overrides: Partial<RecordsArchiveFilters> = {},
): string {
  const query = new URLSearchParams();
  appendIfPresent(query, "search", overrides.search ?? filters.search);
  appendIfPresent(query, "status", overrides.status ?? filters.status);
  appendIfPresent(query, "from", overrides.from ?? filters.from);
  appendIfPresent(query, "to", overrides.to ?? filters.to);
  appendIfPresent(query, "program", overrides.program ?? filters.program);
  appendIfPresent(query, "page", overrides.page ?? filters.page);

  const queryString = query.toString();
  return queryString ? `${basePath}?${queryString}` : basePath;
}

export function buildRecordsArchiveReportUrl(
  basePath: string,
  filters: RecordsArchiveReportFilters,
  overrides: Partial<RecordsArchiveReportFilters> = {},
): string {
  const query = new URLSearchParams();
  appendIfPresent(query, "reportStatus", overrides.status ?? filters.status);
  appendIfPresent(query, "reportFrom", overrides.from ?? filters.from);
  appendIfPresent(query, "reportTo", overrides.to ?? filters.to);
  appendIfPresent(query, "reportProgram", overrides.program ?? filters.program);
  appendIfPresent(query, "breakdown", overrides.breakdown ?? filters.breakdown);

  const queryString = query.toString();
  return queryString ? `${basePath}?${queryString}` : basePath;
}

