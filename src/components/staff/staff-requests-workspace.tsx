import Link from "next/link";
import {
  buildStaffDashboardUrl,
  type StaffDashboardOverviewFilters,
  type StaffDashboardSearchParams,
} from "@/lib/staff-dashboard-query";
import {
  formatBusinessDateTime,
  formatPurposeLabel,
  formatRequestStatusLabel,
} from "@/lib/gmc-request";
import { getPrivateStorageDownloadUrl } from "@/lib/storage/private-file-url";
import {
  STAFF_REQUEST_STATUSES,
  type StaffDashboardData,
  type StaffDashboardFilters,
} from "@/server/services/staff-dashboard-service";
import StaffDashboardOverview from "@/components/staff/staff-dashboard-overview";
import StaffRequestDetailModal from "@/components/staff/staff-request-detail-modal";
import StaffRequestProcessModal from "@/components/staff/staff-request-process-modal";
import type { StaffDashboardOverviewData } from "@/server/services/staff-dashboard-overview-service";

interface StaffRequestsWorkspaceProps {
  title?: string;
  description?: string;
  basePath: string;
  data: StaffDashboardData;
  filters: StaffDashboardFilters;
  overview?: StaffDashboardOverviewData;
  overviewFilters?: StaffDashboardOverviewFilters;
  searchParams?: StaffDashboardSearchParams;
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
    case "PENDING":
      return "border-[#E0B50F]/40 bg-[#E0B50F]/15 text-[#8F7306]";
    case "REJECTED":
      return "border-[#E05252]/40 bg-[#E05252]/15 text-[#9B2C2C]";
    case "RELEASED":
      return "border-[#34B1AA]/40 bg-[#34B1AA]/15 text-[#1E746F]";
    default:
      return "border-[#8A94A6]/40 bg-[#8A94A6]/15 text-[#4A5260]";
  }
}

export default function StaffRequestsWorkspace({
  title,
  description,
  basePath,
  data,
  filters,
  overview,
  overviewFilters,
}: StaffRequestsWorkspaceProps) {
  const showingStart = data.pagination.totalResults === 0 ? 0 : (data.pagination.page - 1) * data.pagination.pageSize + 1;
  const showingEnd = data.pagination.totalResults === 0 ? 0 : Math.min(data.pagination.page * data.pagination.pageSize, data.pagination.totalResults);
  const previousPageHref = data.pagination.hasPreviousPage
    ? buildStaffDashboardUrl(basePath, filters, { page: data.pagination.page - 1 })
    : null;
  const nextPageHref = data.pagination.hasNextPage
    ? buildStaffDashboardUrl(basePath, filters, { page: data.pagination.page + 1 })
    : null;

  return (
    <section className="space-y-8">
      {overview ? (
        <StaffDashboardOverview
          basePath={basePath}
          filters={overviewFilters ?? { ...filters, purposeFrom: "", purposeTo: "" }}
          data={overview}
        />
      ) : (
        <div className="rounded-[2rem] border border-[#2D2D3F] bg-[#1E1E2C] p-6 shadow-xl sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-bold tracking-tight text-white">
                {title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#94A3B8]">
                {description}
              </p>
            </div>

            <div className="grid gap-4 text-sm sm:grid-cols-2 xl:grid-cols-4 w-full lg:w-auto">
              {/* Card 1: Blue Accent (#3B8FF3) */}
              <div className="relative overflow-hidden rounded-2xl border border-[#2D2D3F] bg-[#242436] p-5 shadow-[0_4px_20px_-2px_rgba(59,143,243,0.15)]">
                <div className="absolute top-0 left-0 right-0 h-1 bg-[#3B8FF3]" />
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#3B8FF3]">
                  Total Requests
                </p>
                <p className="mt-3 font-mono text-3xl font-bold text-white tabular-nums">
                  {data.summary.totalRequests}
                </p>
              </div>

              {/* Card 2: Gold Accent (#E0B50F) */}
              <div className="relative overflow-hidden rounded-2xl border border-[#2D2D3F] bg-[#242436] p-5 shadow-[0_4px_20px_-2px_rgba(224,181,15,0.15)]">
                <div className="absolute top-0 left-0 right-0 h-1 bg-[#E0B50F]" />
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#E0B50F]">
                  Pending
                </p>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <p className="font-mono text-3xl font-bold text-white tabular-nums">
                    {data.summary.pendingRequests}
                  </p>
                  <span className="rounded-full border border-[#E0B50F]/40 bg-[#E0B50F]/15 px-2.5 py-0.5 text-[11px] font-semibold text-[#E0B50F]">
                    Requires Action
                  </span>
                </div>
              </div>

              {/* Card 3: Teal Accent (#34B1AA) */}
              <div className="relative overflow-hidden rounded-2xl border border-[#2D2D3F] bg-[#242436] p-5 shadow-[0_4px_20px_-2px_rgba(52,177,170,0.15)]">
                <div className="absolute top-0 left-0 right-0 h-1 bg-[#34B1AA]" />
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#34B1AA]">
                  Approved Today
                </p>
                <p className="mt-3 font-mono text-3xl font-bold text-white tabular-nums">
                  {data.summary.approvedToday}
                </p>
              </div>

              {/* Card 4: Orange Accent (#F29F67) */}
              <div className="relative overflow-hidden rounded-2xl border border-[#2D2D3F] bg-[#242436] p-5 shadow-[0_4px_20px_-2px_rgba(242,159,103,0.15)]">
                <div className="absolute top-0 left-0 right-0 h-1 bg-[#F29F67]" />
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#F29F67]">
                  Released This Month
                </p>
                <p className="mt-3 font-mono text-3xl font-bold text-white tabular-nums">
                  {data.summary.releasedThisMonth}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <section
        id="requests"
        className="overflow-hidden rounded-[2rem] border border-[#E2E8F0] bg-white shadow-sm"
      >
        <div className="border-b border-[#E2E8F0] px-6 py-5 sm:px-8">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h3 className="text-xl font-semibold text-[#1E1E2C]">Incoming Requests</h3>
              <p className="mt-1 text-sm text-slate-600">
                Search by name or ID, filter by status, and review requests that need staff action.
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
                placeholder="Name, student ID, or request reference"
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
                <option value="all">All statuses</option>
                {STAFF_REQUEST_STATUSES.filter((status) => status !== "all").map(
                  (status) => (
                    <option key={status} value={status}>
                      {formatRequestStatusLabel(status)}
                    </option>
                  ),
                )}
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
                className="inline-flex w-full items-center justify-center rounded-2xl bg-[#F29F67] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#e08e56] shadow-sm"
              >
                Filter
              </button>
            </div>
          </form>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr className="text-left text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
                <th className="px-6 py-4 sm:px-8">Request ID</th>
                <th className="px-6 py-4 sm:px-8">Student Name</th>
                <th className="px-6 py-4 sm:px-8">Course</th>
                <th className="px-6 py-4 sm:px-8">Date Submitted</th>
                <th className="px-6 py-4 sm:px-8">Purpose</th>
                <th className="px-6 py-4 sm:px-8">Status</th>
                <th className="px-6 py-4 sm:px-8">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {data.requests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-sm text-slate-500">
                    No requests match the current filters.
                  </td>
                </tr>
              ) : (
                data.requests.map((request) => {
                  return (
                    <tr key={request.id} className="gmc-table-row">
                      <td className="px-6 py-5 align-top sm:px-8">
                        <div className="font-semibold text-[#1E1E2C]">
                          {request.requestReferenceNumber}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">{request.studentId}</div>
                      </td>
                      <td className="px-6 py-5 align-top sm:px-8">
                        <div className="font-medium text-slate-900">
                          {fullName(
                            request.studentFirstName,
                            request.studentMiddleInitial,
                            request.studentLastName,
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5 align-top text-sm text-slate-700 sm:px-8">
                        {request.studentCourseProgram}
                      </td>
                      <td className="px-6 py-5 align-top text-sm text-slate-700 sm:px-8">
                        {formatBusinessDateTime(request.dateSubmitted)}
                      </td>
                      <td className="px-6 py-5 align-top text-sm text-slate-700 sm:px-8">
                        {formatPurposeLabel(request.purposeOfRequest)}
                      </td>
                      <td className="px-6 py-5 align-top sm:px-8">
                        <span
                          className={[
                            "inline-flex rounded-full border px-3 py-1 text-xs font-semibold",
                            statusBadgeClass(request.status),
                          ].join(" ")}
                        >
                          {formatRequestStatusLabel(request.status)}
                        </span>
                      </td>
                      <td className="px-6 py-5 align-top sm:px-8">
                        <div className="flex flex-wrap gap-2">
                          {request.status === "PENDING" ? (
                            <StaffRequestProcessModal
                              requestId={request.id}
                              requestReferenceNumber={request.requestReferenceNumber}
                            />
                          ) : (
                            <StaffRequestDetailModal
                              requestId={request.id}
                              requestReferenceNumber={request.requestReferenceNumber}
                            />
                          )}
                          {request.status === "RELEASED" && request.certificate?.generatedPdfUrl ? (
                            <a
                              href={getPrivateStorageDownloadUrl(
                                request.certificate.generatedPdfUrl,
                                `${fullName(request.studentFirstName, request.studentMiddleInitial, request.studentLastName)}_${request.certificate.certificateNumber}.pdf`,
                              )}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex rounded-full bg-amber-400 px-3 py-1.5 text-xs font-semibold text-slate-950 transition hover:bg-amber-300"
                            >
                              Download PDF
                            </a>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

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
