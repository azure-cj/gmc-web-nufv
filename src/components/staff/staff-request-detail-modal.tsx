"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import {
  formatBusinessDateTime,
  formatPurposeLabel,
  formatRequestStatusLabel,
} from "@/lib/gmc-request";
import { getPrivateStorageDownloadUrl } from "@/lib/storage/private-file-url";

interface StaffRequestReadOnlyDetail {
  requestReferenceNumber: string;
  status: string;
  dateSubmitted: string;
  dateReleased: string | null;
  studentFullName: string;
  studentId: string;
  studentCourseProgram: string;
  studentAcademicYear: string;
  term: string;
  purposeOfRequest: string;
  purposeOfCertificate: string;
  officialReceiptNumber: string | null;
  certificateNumber: string | null;
  authorizedSignatory: string | null;
  officeDesignation: string | null;
  hasViolationRecord: boolean;
  violationWording: string;
  generatedPdfUrl: string | null;
}

interface DetailResponse {
  detail?: StaffRequestReadOnlyDetail;
  formError?: string;
}

interface StaffRequestDetailModalProps {
  requestId: string;
  requestReferenceNumber: string;
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case "PENDING":
      return "border-[#E0B50F]/40 bg-[#E0B50F]/15 text-[#8F7306]";
    case "APPROVED":
    case "RELEASED":
      return "border-[#34B1AA]/40 bg-[#34B1AA]/15 text-[#1E746F]";
    case "GENERATED":
      return "border-[#3B8FF3]/40 bg-[#3B8FF3]/15 text-[#1E589B]";
    case "REJECTED":
    case "RETURNED":
    case "DELIVERY_FAILED":
      return "border-[#E05252]/40 bg-[#E05252]/15 text-[#9B2C2C]";
    default:
      return "border-[#8A94A6]/40 bg-[#8A94A6]/15 text-[#4A5260]";
  }
}

function DetailField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
        {label}
      </p>
      <div className="mt-2 text-sm font-medium text-slate-900">{children}</div>
    </div>
  );
}

export default function StaffRequestDetailModal({
  requestId,
  requestReferenceNumber,
}: StaffRequestDetailModalProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [detail, setDetail] = useState<StaffRequestReadOnlyDetail | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeModal();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const openModal = async () => {
    setIsOpen(true);
    setLoadError(null);
    setIsLoading(true);
    setDetail(null);

    try {
      const response = await fetch(
        `/api/staff/gmc-requests/${requestId}`,
        { method: "GET" },
      );
      const body = (await response.json().catch(() => null)) as DetailResponse | null;

      if (!response.ok) {
        if (response.status === 401) {
          router.push("/staff/login");
          return;
        }
        setLoadError(
          body?.formError ?? "Unable to load the request. Please try again.",
        );
        return;
      }

      if (!body?.detail) {
        setLoadError("The request could not be loaded.");
        return;
      }

      setDetail(body.detail);
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Unable to load the request. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  function closeModal() {
    setIsOpen(false);
    setDetail(null);
    setLoadError(null);
  }

  const downloadHref =
    detail && detail.generatedPdfUrl
      ? getPrivateStorageDownloadUrl(
          detail.generatedPdfUrl,
          `${detail.studentFullName}_${detail.certificateNumber ?? "certificate"}.pdf`,
        )
      : null;

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
      >
        View
      </button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:p-8"
          role="dialog"
          aria-modal="true"
          aria-label={`View request ${requestReferenceNumber}`}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeModal();
            }
          }}
        >
          <div className="my-auto w-full max-w-2xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5 sm:px-8">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
                  Request {requestReferenceNumber}
                </p>
                <p className="mt-1 text-lg font-semibold text-[#1E1E2C]">
                  {detail ? detail.studentFullName : "Loading request"}
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="inline-flex rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                aria-label="Close dialog"
              >
                Close
              </button>
            </div>

            {isLoading ? (
              <div className="px-6 py-16 text-center sm:px-8">
                <p className="text-base text-slate-600">Loading request details...</p>
              </div>
            ) : loadError ? (
              <div className="px-6 py-16 text-center sm:px-8">
                <p className="text-base text-rose-700">{loadError}</p>
                <button
                  type="button"
                  onClick={closeModal}
                  className="mt-6 inline-flex rounded-2xl bg-slate-950 px-6 py-3 text-base font-semibold text-white transition hover:bg-slate-800"
                >
                  Close
                </button>
              </div>
            ) : !detail ? (
              <div className="px-6 py-16 text-center sm:px-8">
                <p className="text-base text-slate-600">No request data available.</p>
              </div>
            ) : (
              <div className="px-6 py-6 sm:px-8">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-[#F29F67]/40 bg-[#F29F67]/15 px-3 py-1 text-xs font-semibold text-[#9A6A3C]">
                    Read-only
                  </span>
                  <span
                    className={[
                      "inline-flex rounded-full border px-3 py-1 text-xs font-semibold",
                      statusBadgeClass(detail.status),
                    ].join(" ")}
                  >
                    {formatRequestStatusLabel(detail.status)}
                  </span>
                  <span
                    className={[
                      "inline-flex rounded-full border px-3 py-1 text-xs font-semibold",
                      detail.hasViolationRecord
                        ? "border-[#E05252]/40 bg-[#E05252]/15 text-[#9B2C2C]"
                        : "border-[#34B1AA]/40 bg-[#34B1AA]/15 text-[#1E746F]",
                    ].join(" ")}
                  >
                    {detail.hasViolationRecord ? "Has Violation" : "No Violation"}
                  </span>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <DetailField label="Student Full Name">
                    {detail.studentFullName}
                  </DetailField>
                  <DetailField label="Student ID Number">
                    {detail.studentId}
                  </DetailField>
                  <DetailField label="Course / Program">
                    {detail.studentCourseProgram}
                  </DetailField>
                  <DetailField label="Term">{detail.term || "-"}</DetailField>
                  <DetailField label="Academic Year">
                    {detail.studentAcademicYear}
                  </DetailField>
                  <DetailField label="Purpose of Certificate">
                    {detail.purposeOfCertificate ||
                      formatPurposeLabel(detail.purposeOfRequest)}
                  </DetailField>
                  <DetailField label="Official Receipt Number">
                    {detail.officialReceiptNumber ?? "Not recorded yet"}
                  </DetailField>
                  <DetailField label="Certificate Number">
                    {detail.certificateNumber ?? "Not generated yet"}
                  </DetailField>
                  <DetailField label="Authorized Signatory">
                    {detail.authorizedSignatory ?? "Not generated yet"}
                  </DetailField>
                  <DetailField label="Office Designation">
                    {detail.officeDesignation ?? "Not generated yet"}
                  </DetailField>
                  <DetailField label="Date Submitted">
                    {formatBusinessDateTime(detail.dateSubmitted)}
                  </DetailField>
                  <DetailField label="Date Released">
                    {detail.dateReleased
                      ? formatBusinessDateTime(detail.dateReleased)
                      : "Not released yet"}
                  </DetailField>
                </div>

                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
                    Violation Record Wording
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    {detail.violationWording}
                  </p>
                </div>

                <div className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
                  {downloadHref ? (
                    <a
                      href={downloadHref}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-300"
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
                      Download PDF
                    </a>
                  ) : (
                    <p className="text-sm text-slate-500">
                      No PDF generated yet — the PDF becomes available after the
                      certificate is released.
                    </p>
                  )}
                  <p className="text-xs text-slate-400">
                    This record is read-only and cannot be modified.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}