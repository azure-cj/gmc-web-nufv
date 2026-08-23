import Link from "next/link";
import {
  buildStaffDashboardUrl,
} from "@/lib/staff-dashboard-query";
import {
  formatBusinessDateTime,
  formatPurposeLabel,
  formatRequestStatusLabel,
} from "@/lib/gmc-request";
import { getPrivateStorageDownloadUrl } from "@/lib/storage/private-file-url";
import {
  STAFF_REQUEST_STATUSES,
  type StaffDashboardFilters,
} from "@/server/services/staff-dashboard-service";
import type { IssuedCertificatesData } from "@/server/services/issued-certificates-service";

interface StaffIssuedCertificatesWorkspaceProps {
  data: IssuedCertificatesData;
  filters: StaffDashboardFilters;
  basePath?: string;
  detailBasePath?: string;
}

function fullName(
  firstName: string,
  middleInitial: string | null,
  lastName: string,
): string {
  const parts = [firstName, middleInitial ? `${middleInitial}.` : null, lastName];
  return parts.filter(Boolean).join(" ");
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case "RELEASED":
      return "border-[#34B1AA]/40 bg-[#34B1AA]/15 text-[#1E746F]";
    case "GENERATED":
      return "border-[#3B8FF3]/40 bg-[#3B8FF3]/15 text-[#1E589B]";
    case "APPROVED":
      return "border-[#34B1AA]/40 bg-[#34B1AA]/15 text-[#1E746F]";
    case "PENDING":
      return "border-[#E0B50F]/40 bg-[#E0B50F]/15 text-[#8F7306]";
    case "REJECTED":
    case "RETURNED":
    case "DELIVERY_FAILED":
      return "border-[#E05252]/40 bg-[#E05252]/15 text-[#9B2C2C]";
    default:
      return "border-[#8A94A6]/40 bg-[#8A94A6]/15 text-[#4A5260]";
  }
}

export default function StaffIssuedCertificatesWorkspace({
  data,
  filters,
  basePath = "/staff/issued-certificates",
  detailBasePath = "/staff/gmc-requests",
}: StaffIssuedCertificatesWorkspaceProps) {
  const showingStart =
    data.pagination.totalResults === 0
      ? 0
      : (data.pagination.page - 1) * data.pagination.pageSize + 1;
  const showingEnd =
    data.pagination.totalResults === 0
      ? 0
      : Math.min(
          data.pagination.page * data.pagination.pageSize,
          data.pagination.totalResults,
        );
  const currentReturnTo = buildStaffDashboardUrl(basePath, filters);
  const previousPageHref = data.pagination.hasPreviousPage
    ? buildStaffDashboardUrl(basePath, filters, {
        page: data.pagination.page - 1,
      })
    : null;
  const nextPageHref = data.pagination.hasNextPage
    ? buildStaffDashboardUrl(basePath, filters, {
        page: data.pagination.page + 1,
      })
    : null;

  return (
    <section className="space-y-8">
      {/* Top Banner & Summary Cards */}
      <div className="rounded-[2rem] border border-[#2D2D3F] bg-[#1E1E2C] p-6 shadow-xl sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[#34B1AA] animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-[0.3em] text-[#34B1AA]">
                Permanent Archive & Lookup
              </span>
            </div>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-white">
              Issued Certificates
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#94A3B8]">
              Permanent historical record of all issued Good Moral Certificates. Search
              by Certificate Number or Student ID, and view or regenerate official PDFs
              on demand.
            </p>
          </div>

          <div className="grid gap-4 text-sm sm:grid-cols-2 xl:grid-cols-4 w-full lg:w-auto">
            {/* Card 1: Total Issued */}
            <div className="relative overflow-hidden rounded-2xl border border-[#2D2D3F] bg-[#242436] p-5 shadow-[0_4px_20px_-2px_rgba(59,143,243,0.15)]">
              <div className="absolute top-0 left-0 right-0 h-1 bg-[#3B8FF3]" />
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#3B8FF3]">
                Total Issued
              </p>
              <p className="mt-3 font-mono text-3xl font-bold text-white tabular-nums">
                {data.summary.totalIssued}
              </p>
              <p className="mt-1 text-[11px] text-[#94A3B8]">Permanent records in database</p>
            </div>

            {/* Card 2: Released This Month */}
            <div className="relative overflow-hidden rounded-2xl border border-[#2D2D3F] bg-[#242436] p-5 shadow-[0_4px_20px_-2px_rgba(242,159,103,0.15)]">
              <div className="absolute top-0 left-0 right-0 h-1 bg-[#F29F67]" />
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#F29F67]">
                Issued This Month
              </p>
              <p className="mt-3 font-mono text-3xl font-bold text-white tabular-nums">
                {data.summary.issuedThisMonth}
              </p>
              <p className="mt-1 text-[11px] text-[#94A3B8]">Current business month</p>
            </div>

            {/* Card 3: Issued Today */}
            <div className="relative overflow-hidden rounded-2xl border border-[#2D2D3F] bg-[#242436] p-5 shadow-[0_4px_20px_-2px_rgba(52,177,170,0.15)]">
              <div className="absolute top-0 left-0 right-0 h-1 bg-[#34B1AA]" />
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#34B1AA]">
                Issued Today
              </p>
              <p className="mt-3 font-mono text-3xl font-bold text-white tabular-nums">
                {data.summary.issuedToday}
              </p>
              <p className="mt-1 text-[11px] text-[#94A3B8]">Today&apos;s completions</p>
            </div>

            {/* Card 4: Retention & Storage Status */}
            <div className="relative overflow-hidden rounded-2xl border border-[#2D2D3F] bg-[#242436] p-5 shadow-[0_4px_20px_-2px_rgba(224,181,15,0.15)]">
              <div className="absolute top-0 left-0 right-0 h-1 bg-[#E0B50F]" />
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#E0B50F]">
                Storage & Regeneration
              </p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-mono text-2xl font-bold text-white tabular-nums">
                  {data.summary.activeInStorage}
                </span>
                <span className="text-xs text-[#94A3B8]">cached /</span>
                <span className="font-mono text-2xl font-bold text-[#E0B50F] tabular-nums">
                  {data.summary.onDemandPurged}
                </span>
                <span className="text-xs text-[#94A3B8]">purged</span>
              </div>
              <p className="mt-1 text-[11px] text-[#94A3B8]">
                Auto on-demand regeneration
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Section */}
      <section
        id="issued-certificates"
        className="overflow-hidden rounded-[2rem] border border-[#E2E8F0] bg-white shadow-sm"
      >
        {/* Filter Bar */}
        <div className="border-b border-[#E2E8F0] px-6 py-5 sm:px-8">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h3 className="text-xl font-semibold text-[#1E1E2C]">
                Issued Certificate Records
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                Filter and look up completed certificates. Click &quot;View / Download Certificate&quot; to open or regenerate the official PDF.
              </p>
            </div>
            <p className="text-sm text-slate-500">
              Showing {showingStart} to {showingEnd} of {data.pagination.totalResults} results
            </p>
          </div>

          <form
            action={basePath}
            method="get"
            className="mt-6 grid gap-4 rounded-3xl border border-[#E2E8F0] bg-slate-50 p-4 lg:grid-cols-12"
          >
            <input type="hidden" name="page" value="1" />

            <label className="block lg:col-span-4">
              <span className="text-sm font-medium text-slate-700">Search</span>
              <input
                type="search"
                name="search"
                defaultValue={filters.search}
                placeholder="Certificate #, Student ID, Name, or Ref"
                className="mt-2 block w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-[#3B8FF3] focus:ring-4 focus:ring-[#3B8FF3]/20"
              />
            </label>

            <label className="block lg:col-span-3">
              <span className="text-sm font-medium text-slate-700">Status</span>
              <select
                name="status"
                defaultValue={filters.status}
                className="mt-2 block w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-[#3B8FF3] focus:ring-4 focus:ring-[#3B8FF3]/20"
              >
                <option value="RELEASED">Released (Completed)</option>
                <option value="all">All statuses</option>
                {STAFF_REQUEST_STATUSES.filter(
                  (status) => status !== "all" && status !== "RELEASED",
                ).map((status) => (
                  <option key={status} value={status}>
                    {formatRequestStatusLabel(status)}
                  </option>
                ))}
              </select>
            </label>

            <label className="block lg:col-span-2">
              <span className="text-sm font-medium text-slate-700">From</span>
              <input
                type="date"
                name="from"
                defaultValue={filters.from}
                className="mt-2 block w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-[#3B8FF3] focus:ring-4 focus:ring-[#3B8FF3]/20"
              />
            </label>

            <label className="block lg:col-span-2">
              <span className="text-sm font-medium text-slate-700">To</span>
              <input
                type="date"
                name="to"
                defaultValue={filters.to}
                className="mt-2 block w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-[#3B8FF3] focus:ring-4 focus:ring-[#3B8FF3]/20"
              />
            </label>

            <div className="flex items-end gap-3 lg:col-span-1 lg:justify-end">
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center rounded-2xl bg-[#1A3C6B] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#0D1B2E] shadow-sm"
              >
                Filter
              </button>
            </div>
          </form>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr className="text-left text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
                <th className="px-6 py-4 sm:px-8">Certificate # / Ref</th>
                <th className="px-6 py-4 sm:px-8">Student Name</th>
                <th className="px-6 py-4 sm:px-8">Course / Program</th>
                <th className="px-6 py-4 sm:px-8">Date Issued</th>
                <th className="px-6 py-4 sm:px-8">PDF Storage State</th>
                <th className="px-6 py-4 sm:px-8">Status</th>
                <th className="px-6 py-4 sm:px-8">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {data.certificates.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-12 text-center text-sm text-slate-500"
                  >
                    No issued certificates match the current filters.
                  </td>
                </tr>
              ) : (
                data.certificates.map((row) => {
                  const studentName = fullName(
                    row.studentFirstName,
                    row.studentMiddleInitial,
                    row.studentLastName,
                  );
                  const certNumber =
                    row.certificate?.certificateNumber || "Pending";
                  const detailHref = `${detailBasePath}/${row.id}?returnTo=${encodeURIComponent(currentReturnTo)}`;
                  const reviewHref = `${detailBasePath}/${row.id}/review?returnTo=${encodeURIComponent(currentReturnTo)}`;
                  const downloadFileRef =
                    row.certificate?.generatedPdfUrl || certNumber;
                  const downloadUrl = getPrivateStorageDownloadUrl(
                    downloadFileRef,
                    `${studentName}_${certNumber}.pdf`,
                  );

                  return (
                    <tr key={row.id} className="gmc-table-row hover:bg-slate-50/70 transition">
                      {/* Column 1: Certificate # & Reference */}
                      <td className="px-6 py-5 align-top sm:px-8">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold text-[#1E1E2C]">
                            {certNumber}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                          <span>Ref: {row.requestReferenceNumber}</span>
                          <span>•</span>
                          <span>ID: {row.studentId}</span>
                        </div>
                      </td>

                      {/* Column 2: Student Name */}
                      <td className="px-6 py-5 align-top sm:px-8">
                        <div className="font-medium text-slate-900">
                          {studentName}
                        </div>
                        <div className="mt-0.5 text-xs text-slate-500">
                          {row.studentEmail}
                        </div>
                      </td>

                      {/* Column 3: Course */}
                      <td className="px-6 py-5 align-top text-sm text-slate-700 sm:px-8">
                        <div>{row.studentCourseProgram}</div>
                        <div className="mt-0.5 text-xs text-slate-500">
                          {formatPurposeLabel(row.purposeOfRequest)}
                        </div>
                      </td>

                      {/* Column 4: Date Issued */}
                      <td className="px-6 py-5 align-top text-sm text-slate-700 sm:px-8">
                        {formatBusinessDateTime(
                          row.dateReleased || row.dateSubmitted,
                        )}
                      </td>

                      {/* Column 5: PDF Storage State */}
                      <td className="px-6 py-5 align-top sm:px-8">
                        {row.pdfStatus === "AVAILABLE" ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#34B1AA]/40 bg-[#34B1AA]/15 px-2.5 py-1 text-xs font-semibold text-[#1E746F]">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#34B1AA]" />
                            Available (Cached)
                          </span>
                        ) : row.pdfStatus === "PURGED" ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                            Purged (Regenerate on download)
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                            Pending Generation
                          </span>
                        )}
                      </td>

                      {/* Column 6: Status */}
                      <td className="px-6 py-5 align-top sm:px-8">
                        <span
                          className={[
                            "inline-flex rounded-full border px-3 py-1 text-xs font-semibold",
                            statusBadgeClass(row.status),
                          ].join(" ")}
                        >
                          {formatRequestStatusLabel(row.status)}
                        </span>
                      </td>

                      {/* Column 7: Action */}
                      <td className="px-6 py-5 align-top sm:px-8">
                        {row.status === "RELEASED" && row.certificate ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <a
                              href={downloadUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-xl bg-[#1A3C6B] px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-[#0D1B2E] shadow-sm"
                            >
                              <svg
                                className="h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                />
                              </svg>
                              View / Download Certificate
                            </a>
                            <Link
                              href={detailHref}
                              className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 transition"
                            >
                              Details
                            </Link>
                          </div>
                        ) : row.status === "GENERATED" ||
                          row.status === "DELIVERY_FAILED" ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              href={reviewHref}
                              className="inline-flex rounded-xl border border-[#3B8FF3]/40 bg-[#3B8FF3]/15 px-3.5 py-2 text-xs font-semibold text-[#1E589B] transition hover:bg-[#3B8FF3]/25"
                            >
                              {row.status === "DELIVERY_FAILED"
                                ? "Retry Generation"
                                : "Review Certificate"}
                            </Link>
                            <Link
                              href={detailHref}
                              className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 transition"
                            >
                              Details
                            </Link>
                          </div>
                        ) : (
                          <Link
                            href={detailHref}
                            className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 transition"
                          >
                            View Details
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex flex-col gap-4 border-t border-slate-200 px-6 py-5 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
          <p className="text-sm text-slate-500">
            Showing {showingStart} to {showingEnd} of {data.pagination.totalResults} results
          </p>

          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500">
              Page {data.pagination.page} of {Math.max(data.pagination.totalPages, 1)}
            </span>
            <div className="flex items-center gap-2">
              {previousPageHref ? (
                <Link
                  href={previousPageHref}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                >
                  Previous
                </Link>
              ) : (
                <span className="rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-medium text-slate-400">
                  Previous
                </span>
              )}
              {nextPageHref ? (
                <Link
                  href={nextPageHref}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                >
                  Next
                </Link>
              ) : (
                <span className="rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-medium text-slate-400">
                  Next
                </span>
              )}
            </div>
          </div>
        </div>
      </section>
    </section>
  );
}
