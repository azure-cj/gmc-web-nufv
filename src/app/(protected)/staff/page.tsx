import { prisma } from "@/lib/prisma";
import {
  parseStaffDashboardOverviewFilters,
  parseStaffDashboardFilters,
} from "@/lib/staff-dashboard-query";
import StaffRequestsWorkspace from "@/components/staff/staff-requests-workspace";
import { getStaffDashboardOverviewData } from "@/server/services/staff-dashboard-overview-service";
import { getStaffDashboardData } from "@/server/services/staff-dashboard-service";

export const dynamic = "force-dynamic";

interface StaffDashboardPageProps {
  searchParams?: Promise<{
    search?: string | string[];
    status?: string | string[];
    from?: string | string[];
    to?: string | string[];
    page?: string | string[];
    purposeFrom?: string | string[];
    purposeTo?: string | string[];
  }>;
}

export default async function StaffDashboardPage({
  searchParams,
}: StaffDashboardPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const filters = parseStaffDashboardFilters(resolvedSearchParams);
  const overviewFilters = parseStaffDashboardOverviewFilters(resolvedSearchParams);
  const data = await getStaffDashboardData(prisma, filters);
  const overview = await getStaffDashboardOverviewData(prisma, overviewFilters);

  return (
    <StaffRequestsWorkspace
      basePath="/staff"
      detailBasePath="/staff/gmc-requests"
      data={data}
      filters={filters}
      overview={overview}
      overviewFilters={overviewFilters}
    />
  );
}
