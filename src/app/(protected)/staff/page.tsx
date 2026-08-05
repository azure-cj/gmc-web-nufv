import { prisma } from "@/lib/prisma";
import { parseStaffDashboardFilters } from "@/lib/staff-dashboard-query";
import StaffRequestsWorkspace from "@/components/staff/staff-requests-workspace";
import { getStaffDashboardData } from "@/server/services/staff-dashboard-service";

export const dynamic = "force-dynamic";

interface StaffDashboardPageProps {
  searchParams?: Promise<{
    search?: string | string[];
    status?: string | string[];
    from?: string | string[];
    to?: string | string[];
    page?: string | string[];
  }>;
}

export default async function StaffDashboardPage({
  searchParams,
}: StaffDashboardPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const filters = parseStaffDashboardFilters(resolvedSearchParams);
  const data = await getStaffDashboardData(prisma, filters);

  return (
    <StaffRequestsWorkspace
      title="Dashboard"
      description="Live operational view of GMC requests, including overall counts and the current intake queue."
      basePath="/staff"
      detailBasePath="/staff/gmc-requests"
      data={data}
      filters={filters}
    />
  );
}
