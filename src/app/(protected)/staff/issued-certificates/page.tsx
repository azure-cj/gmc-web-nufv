import { prisma } from "@/lib/prisma";
import { parseStaffDashboardFilters } from "@/lib/staff-dashboard-query";
import StaffRequestsWorkspace from "@/components/staff/staff-requests-workspace";
import { getStaffDashboardData } from "@/server/services/staff-dashboard-service";

export const dynamic = "force-dynamic";

interface StaffIssuedCertificatesPageProps {
  searchParams?: Promise<{
    search?: string | string[];
    status?: string | string[];
    from?: string | string[];
    to?: string | string[];
    page?: string | string[];
  }>;
}

export default async function StaffIssuedCertificatesPage({
  searchParams,
}: StaffIssuedCertificatesPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const parsedFilters = parseStaffDashboardFilters(resolvedSearchParams);

  // Default status to "GENERATED" for issued certificates workspace if not explicitly set
  const filters = {
    ...parsedFilters,
    status: resolvedSearchParams.status ? parsedFilters.status : "GENERATED",
  };

  const data = await getStaffDashboardData(prisma, filters);

  return (
    <StaffRequestsWorkspace
      title="Issued Certificates"
      description="View, review, and manage generated and released Good Moral Certificates."
      basePath="/staff/issued-certificates"
      detailBasePath="/staff/gmc-requests"
      data={data}
      filters={filters}
    />
  );
}
