"use client";

import Link from "next/link";
import {
  buildRecordsArchiveUrl,
  RECORDS_ARCHIVE_BREAKDOWNS,
  RECORDS_ARCHIVE_REPORT_STATUSES,
  RECORDS_ARCHIVE_STATUSES,
  type RecordsArchiveFilters,
  type RecordsArchiveReportFilters,
} from "@/lib/records-archive-query";
import { formatRequestStatusLabel } from "@/lib/gmc-request";
import { getPrivateStorageDownloadUrl } from "@/lib/storage/private-file-url";
import StaffRequestDetailModal from "@/components/staff/staff-request-detail-modal";
import type {
  RecordsArchivePageData,
  RecordsArchiveReportData,
} from "@/server/services/records-archive-service";

interface StaffRecordsArchiveWorkspaceProps {
  basePath: string;
  data: RecordsArchivePageData;
  filters: RecordsArchiveFilters;
  reportData: RecordsArchiveReportData;
  reportFilters: RecordsArchiveReportFilters;
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

function summaryCardClass(index: number): string {
  switch (index) {
    case 0:
      return "border-slate-200 bg-slate-50";
    case 1:
      return "border-[#34B1AA]/30 bg-[#34B1AA]/10";
    case 2:
      return "border-[#3B8FF3]/30 bg-[#3B8FF3]/10";
    default:
      return "border-[#E0B50F]/30 bg-[#E0B50F]/10";
  }
}

function buildExportHref(
  format: "csv" | "pdf",
  reportFilters: RecordsArchiveReportFilters,
): string {
  const query = new URLSearchParams();
  query.set("format", format);
  if (reportFilters.status) {
    query.set("reportStatus", reportFilters.status);
  }
  if (reportFilters.from) {
    query.set("reportFrom", reportFilters.from);
  }
  if (reportFilters.to) {
    query.set("reportTo", reportFilters.to);
  }
  if (reportFilters.program) {
    query.set("reportProgram", reportFilters.program);
  }
  if (reportFilters.breakdown) {
    query.set("breakdown", reportFilters.breakdown);
  }
  return `/api/staff/records-archive/export?${query.toString()}`;
}

export default function StaffRecordsArchiveWorkspace({
  basePath,
  data,
  filters,
  reportData,
  reportFilters,
}: StaffRecordsArchiveWorkspaceProps) {
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
  const previousPageHref = data.pagination.hasPreviousPage
    ? buildRecordsArchiveUrl(basePath, filters, {
        page: data.pagination.page - 1,
      })
    : null;
  const nextPageHref = data.pagination.hasNextPage
    ? buildRecordsArchiveUrl(basePath, filters, {
        page: data.pagination.page + 1,
      })
    : null;

  return (
    <section className="space-y-8">
      <div className="rounded-[2rem] border border-[#2D2D3F] bg-[#1E1E2C] p-6 shadow-xl sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-bold tracking-tight text-white">
              Records Archive
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#94A3B8]">
              Search every request on file, including pending, approved, generated, released,
              rejected, returned, and delivery-failed records. Open any record to review the
              full audit trail in chronological order.
            </p>
          </div>

          <div className="grid gap-4 text-sm sm:grid-cols-2 xl:grid-cols-3 w-full lg:w-auto">
            {[
              {
                label: "Records on Page",
                value: String(data.pagination.totalResults),
                color: "#3B8FF3",
                glow: "shadow-[0_4px_20px_-2px_rgba(59,143,243,0.15)]",
              },
              {
                label: "Issuance Summary",
                value: String(reportData.summary.totalCertificates),
                color: "#E0B50F",
                glow: "shadow-[0_4px_20px_-2px_rgba(224,181,15,0.15)]",
              },
              {
                label: "Release Count",
                value: String(reportData.summary.releasedCount),
                color: "#34B1AA",
                glow: "shadow-[0_4px_20px_-2px_rgba(52,177,170,0.15)]",
              },
            ].map((item) => (
              <div
                key={item.label}
                className={[
                  "relative overflow-hidden rounded-2xl border border-[#2D2D3F] bg-[#242436] p-5",
                  item.glow,
                ].join(" ")}
              >
                <div
                  className="absolute top-0 left-0 right-0 h-1"
                  style={{ backgroundColor: item.color }}
                />
                <p
                  className="text-xs font-bold uppercase tracking-[0.25em]"
                  style={{ color: item.color }}
                >
                  {item.label}
                </p>
                <p className="mt-3 font-mono text-3xl font-bold text-white tabular-nums">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-5 sm:px-8">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h3 className="text-xl font-semibold text-slate-950">Archive Records</h3>
              <p className="mt-1 text-sm text-slate-600">
                Search by student name, student ID, reference number, receipt number, or
                certificate number.
              </p>
            </div>
            <p className="text-sm text-slate-500">
              Showing {showingStart} to {showingEnd} of {data.pagination.totalResults} results
            </p>
          </div>

          <form
            action={basePath}
            method="get"
            className="mt-6 grid gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-4 lg:grid-cols-12"
          >
            <input type="hidden" name="page" value="1" />
            <label className="block lg:col-span-4">
              <span className="text-sm font-medium text-slate-700">Search</span>
              <input
                type="search"
                name="search"
                defaultValue={filters.search}
                placeholder="Name, student ID, reference number, or certificate no."
                className="mt-2 block w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-400/20"
              />
            </label>

            <label className="block lg:col-span-3">
              <span className="text-sm font-medium text-slate-700">Status</span>
              <select
                name="status"
                defaultValue={filters.status}
                className="mt-2 block w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-400/20"
              >
                {RECORDS_ARCHIVE_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status === "all" ? "All statuses" : formatRequestStatusLabel(status)}
                  </option>
                ))}
              </select>
            </label>

            <label className="block lg:col-span-3">
              <span className="text-sm font-medium text-slate-700">Course / Program</span>
              <input
                type="text"
                name="program"
                defaultValue={filters.program}
                placeholder="e.g. BSIT"
                className="mt-2 block w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-400/20"
              />
            </label>

            <label className="block lg:col-span-1">
              <span className="text-sm font-medium text-slate-700">From</span>
              <input
                type="date"
                name="from"
                defaultValue={filters.from}
                className="mt-2 block w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-400/20"
              />
            </label>

            <label className="block lg:col-span-1">
              <span className="text-sm font-medium text-slate-700">To</span>
              <input
                type="date"
                name="to"
                defaultValue={filters.to}
                className="mt-2 block w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-400/20"
              />
            </label>

            <div className="flex items-end lg:col-span-12 lg:justify-end">
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Filter Archive
              </button>
            </div>
          </form>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr className="text-left text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
                <th className="px-6 py-4 sm:px-8">Student Information</th>
                <th className="px-6 py-4 sm:px-8">Certificate No.</th>
                <th className="px-6 py-4 sm:px-8">Date of Request</th>
                <th className="px-6 py-4 sm:px-8">Date of Release</th>
                <th className="px-6 py-4 sm:px-8">Request Status</th>
                <th className="px-6 py-4 sm:px-8">Payment Verification Details</th>
                <th className="px-6 py-4 sm:px-8">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {data.requests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-sm text-slate-500">
                    No archive records match the current filters.
                  </td>
                </tr>
              ) : (
                data.requests.map((request) => (
                  <tr key={request.id} className="gmc-table-row">
                    <td className="px-6 py-5 align-top sm:px-8">
                      <div className="font-semibold text-slate-950">
                        {request.studentFullName}
                      </div>
                      <div className="mt-1 space-y-1 text-xs text-slate-500">
                        <p>{request.studentId}</p>
                        <p>{request.studentCourseProgram}</p>
                        <p>{request.studentAcademicYear}</p>
                        <p>{request.requestReferenceNumber}</p>
                      </div>
                    </td>
                    <td className="px-6 py-5 align-top text-sm text-slate-700 sm:px-8">
                      {request.certificateNumber ?? "Not issued yet"}
                    </td>
                    <td className="px-6 py-5 align-top text-sm text-slate-700 sm:px-8">
                      {request.dateSubmitted}
                    </td>
                    <td className="px-6 py-5 align-top text-sm text-slate-700 sm:px-8">
                      {request.dateReleased ?? "Not released yet"}
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
                      <div className="space-y-2 text-sm text-slate-700">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                            Receipt Reference
                          </p>
                          <p className="mt-1 font-medium text-slate-950">
                            {request.officialReceiptNumber ?? "Not recorded"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                            Verification Outcome
                          </p>
                          <p className="mt-1 font-medium text-slate-950">
                            {request.paymentVerificationStatus}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 align-top sm:px-8">
                      <StaffRequestDetailModal
                        requestId={request.id}
                        requestReferenceNumber={request.requestReferenceNumber}
                      />
                      {request.status === "RELEASED" && request.generatedPdfUrl ? (
                        <a
                          href={getPrivateStorageDownloadUrl(
                            request.generatedPdfUrl,
                            `${request.studentFullName}_${request.certificateNumber}.pdf`,
                          )}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-flex rounded-full bg-amber-400 px-3 py-1.5 text-xs font-semibold text-slate-950 transition hover:bg-amber-300"
                        >
                          Download PDF
                        </a>
                      ) : null}
                    </td>
                  </tr>
                ))
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

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-amber-600">
              Reporting
            </p>
            <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
              Summary Report
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Generate a certificate issuance summary by status or course/program, then export
              the result as CSV or PDF.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href={buildExportHref("csv", reportFilters)}
              className="inline-flex rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Export CSV
            </a>
            <a
              href={buildExportHref("pdf", reportFilters)}
              className="inline-flex rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Export PDF
            </a>
          </div>
        </div>

        <form
          action={basePath}
          method="get"
          className="mt-6 grid gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-4 lg:grid-cols-12"
        >
          <input type="hidden" name="page" value={filters.page} />
          <input type="hidden" name="search" value={filters.search} />
          <input type="hidden" name="status" value={filters.status} />
          <input type="hidden" name="from" value={filters.from} />
          <input type="hidden" name="to" value={filters.to} />
          <input type="hidden" name="program" value={filters.program} />

          <label className="block lg:col-span-3">
            <span className="text-sm font-medium text-slate-700">Breakdown</span>
            <select
              name="breakdown"
              defaultValue={reportFilters.breakdown}
              className="mt-2 block w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-400/20"
            >
              {RECORDS_ARCHIVE_BREAKDOWNS.map((breakdown) => (
                <option key={breakdown} value={breakdown}>
                  {breakdown === "PROGRAM" ? "Course / Program" : "Request Status"}
                </option>
              ))}
            </select>
          </label>

          <label className="block lg:col-span-3">
            <span className="text-sm font-medium text-slate-700">Status</span>
            <select
              name="reportStatus"
              defaultValue={reportFilters.status}
              className="mt-2 block w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-400/20"
            >
              {RECORDS_ARCHIVE_REPORT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status === "all" ? "All certificate statuses" : formatRequestStatusLabel(status)}
                </option>
              ))}
            </select>
          </label>

          <label className="block lg:col-span-3">
            <span className="text-sm font-medium text-slate-700">Course / Program</span>
            <input
              type="text"
              name="reportProgram"
              defaultValue={reportFilters.program}
              placeholder="e.g. BSIT"
              className="mt-2 block w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-400/20"
            />
          </label>

          <label className="block lg:col-span-1">
            <span className="text-sm font-medium text-slate-700">From</span>
            <input
              type="date"
              name="reportFrom"
              defaultValue={reportFilters.from}
              className="mt-2 block w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-400/20"
            />
          </label>

          <label className="block lg:col-span-1">
            <span className="text-sm font-medium text-slate-700">To</span>
            <input
              type="date"
              name="reportTo"
              defaultValue={reportFilters.to}
              className="mt-2 block w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-400/20"
            />
          </label>

          <div className="flex items-end lg:col-span-1 lg:justify-end">
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Refresh
            </button>
          </div>
        </form>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
          {[
            {
              label: "Certificates",
              value: reportData.summary.totalCertificates,
            },
            {
              label: "Released",
              value: reportData.summary.releasedCount,
            },
          ].map((item, index) => (
            <div
              key={item.label}
              className={[
                "rounded-2xl border px-4 py-3",
                summaryCardClass(index),
              ].join(" ")}
            >
              <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
                {item.label}
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 overflow-hidden rounded-[1.75rem] border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr className="text-left text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
                <th className="px-6 py-4 sm:px-8">
                  {reportData.summary.breakdownLabel}
                </th>
                <th className="px-6 py-4 sm:px-8">Total</th>
                <th className="px-6 py-4 sm:px-8">Released</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {reportData.rows.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-sm text-slate-500">
                    No certificate issuances match the selected report filters.
                  </td>
                </tr>
              ) : (
                reportData.rows.map((row) => (
                  <tr key={row.key} className="gmc-table-row">
                    <td className="px-6 py-5 align-top font-medium text-slate-950 sm:px-8">
                      {row.label}
                    </td>
                    <td className="px-6 py-5 align-top text-slate-700 sm:px-8">
                      {row.totalCertificates}
                    </td>
                    <td className="px-6 py-5 align-top text-slate-700 sm:px-8">
                      {row.releasedCount}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-slate-950 p-6 text-slate-100 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-amber-300/80">
          Retention and Access Control
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <p className="text-sm font-semibold text-white">Indefinite retention</p>
            <p className="mt-2 text-sm leading-7 text-slate-300">
              Requests, payment proof files, generated PDFs, and audit logs remain in the
              system indefinitely. No auto-delete job is configured.
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <p className="text-sm font-semibold text-white">Staff-only access</p>
            <p className="mt-2 text-sm leading-7 text-slate-300">
              Dashboard, archive, and reporting routes are protected by the staff layout and
              the temporary staff session cookie.
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <p className="text-sm font-semibold text-white">Audit trail</p>
            <p className="mt-2 text-sm leading-7 text-slate-300">
              Administrative status changes, certificate actions, and archive exports write
              audit log entries with a timestamp and actor.
            </p>
          </div>
        </div>
      </section>
    </section>
  );
}
