import {
  STAFF_REQUEST_STATUSES,
  normalizeDashboardPage,
  type StaffDashboardFilters,
  type StaffRequestStatusFilter,
} from "@/server/services/staff-dashboard-service";

type SearchParamValue = string | string[] | undefined;

export interface StaffDashboardSearchParams {
  search?: SearchParamValue;
  status?: SearchParamValue;
  from?: SearchParamValue;
  to?: SearchParamValue;
  page?: SearchParamValue;
}

function firstSearchParam(value: SearchParamValue): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function isSupportedStatus(value: string): value is StaffRequestStatusFilter {
  return STAFF_REQUEST_STATUSES.includes(value as StaffRequestStatusFilter);
}

export function parseStaffDashboardFilters(
  searchParams: StaffDashboardSearchParams,
): StaffDashboardFilters {
  const status = firstSearchParam(searchParams.status);

  return {
    search: firstSearchParam(searchParams.search),
    status: isSupportedStatus(status) ? status : "all",
    from: firstSearchParam(searchParams.from),
    to: firstSearchParam(searchParams.to),
    page: normalizeDashboardPage(Number(firstSearchParam(searchParams.page) || 1)),
  };
}

function appendIfPresent(
  query: URLSearchParams,
  key: keyof StaffDashboardFilters,
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

export function buildStaffDashboardUrl(
  basePath: string,
  filters: StaffDashboardFilters,
  overrides: Partial<StaffDashboardFilters> = {},
): string {
  const query = new URLSearchParams();
  appendIfPresent(query, "search", overrides.search ?? filters.search);
  appendIfPresent(query, "status", overrides.status ?? filters.status);
  appendIfPresent(query, "from", overrides.from ?? filters.from);
  appendIfPresent(query, "to", overrides.to ?? filters.to);
  appendIfPresent(query, "page", overrides.page ?? filters.page);

  const queryString = query.toString();
  return queryString ? `${basePath}?${queryString}` : basePath;
}
