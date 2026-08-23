import { prisma } from "@/lib/prisma";
import { parseStaffDashboardFilters } from "@/lib/staff-dashboard-query";
import StaffIssuedCertificatesWorkspace from "@/components/staff/staff-issued-certificates-workspace";
import { getIssuedCertificatesData } from "@/server/services/issued-certificates-service";

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

  // Default status to "RELEASED" for issued certificates workspace if not explicitly specified
  const filters = {
    ...parsedFilters,
    status: resolvedSearchParams.status ? parsedFilters.status : "RELEASED",
  };

  const data = await getIssuedCertificatesData(prisma, filters);

  return (
    <StaffIssuedCertificatesWorkspace
      data={data}
      filters={filters}
      basePath="/staff/issued-certificates"
      detailBasePath="/staff/gmc-requests"
    />
  );
}
