import { prisma } from "@/lib/prisma";
import {
  parseRecordsArchiveFilters,
  parseRecordsArchiveReportFilters,
} from "@/lib/records-archive-query";
import StaffRecordsArchiveWorkspace from "@/components/staff/staff-records-archive-workspace";
import {
  getRecordsArchivePageData,
  getRecordsArchiveReportData,
} from "@/server/services/records-archive-service";

export const dynamic = "force-dynamic";

interface StaffRecordsArchivePageProps {
  searchParams?: Promise<{
    search?: string | string[];
    status?: string | string[];
    from?: string | string[];
    to?: string | string[];
    program?: string | string[];
    page?: string | string[];
    reportStatus?: string | string[];
    reportFrom?: string | string[];
    reportTo?: string | string[];
    reportProgram?: string | string[];
    breakdown?: string | string[];
  }>;
}

export default async function StaffRecordsArchivePage({
  searchParams,
}: StaffRecordsArchivePageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const filters = parseRecordsArchiveFilters(resolvedSearchParams);
  const reportFilters = parseRecordsArchiveReportFilters(resolvedSearchParams);
  const [data, reportData] = await Promise.all([
    getRecordsArchivePageData(prisma, filters),
    getRecordsArchiveReportData(prisma, reportFilters),
  ]);

  return (
    <StaffRecordsArchiveWorkspace
      basePath="/staff/records-archive"
      data={data}
      filters={filters}
      reportData={reportData}
      reportFilters={reportFilters}
    />
  );
}
