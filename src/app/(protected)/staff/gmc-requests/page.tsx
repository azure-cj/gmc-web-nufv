import { prisma } from "@/lib/prisma";
import { parseStaffDashboardFilters } from "@/lib/staff-dashboard-query";
import StaffRequestsWorkspace from "@/components/staff/staff-requests-workspace";
import { getStaffDashboardData } from "@/server/services/staff-dashboard-service";

export const dynamic = "force-dynamic";

interface StaffGmcRequestsPageProps {
  searchParams?: Promise<{
    search?: string | string[];
    status?: string | string[];
    from?: string | string[];
    to?: string | string[];
    page?: string | string[];
  }>;
}

export default async function StaffGmcRequestsPage({
  searchParams,
}: StaffGmcRequestsPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const filters = parseStaffDashboardFilters(resolvedSearchParams);
  const data = await getStaffDashboardData(prisma, filters);

  return (
    <StaffRequestsWorkspace
      title="GMC Requests"
      description="Search and review incoming Good Moral Certificate requests. Pending requests can be approved, returned, or rejected from the review screen."
      basePath="/staff/gmc-requests"
      detailBasePath="/staff/gmc-requests"
      data={data}
      filters={filters}
    />
  );
}
