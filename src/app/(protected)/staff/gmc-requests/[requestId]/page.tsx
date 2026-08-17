import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  formatBusinessDateTime,
  formatPaymentVerificationLabel,
  formatPurposeLabel,
  formatRequestStatusLabel,
  getFileViewerKind,
} from "@/lib/gmc-request";
import { getPrivateStorageDownloadUrl } from "@/lib/storage/private-file";
import StaffRequestReviewClient from "@/components/staff/staff-request-review-client";

export const dynamic = "force-dynamic";

interface StaffRequestReviewPageProps {
  params: Promise<{
    requestId: string;
  }>;
  searchParams?: Promise<{
    mode?: string | string[];
    returnTo?: string | string[];
  }>;
}

function firstSearchParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function fullName(
  firstName: string,
  middleInitial: string | null,
  lastName: string,
): string {
  return [firstName, middleInitial ? `${middleInitial}.` : null, lastName]
    .filter(Boolean)
    .join(" ");
}

function requestStatusClass(status: string): string {
  switch (status) {
    case "PENDING":
      return "border-[#E0B50F]/40 bg-[#E0B50F]/15 text-[#8F7306]";
    case "APPROVED":
      return "border-[#34B1AA]/40 bg-[#34B1AA]/15 text-[#1E746F]";
    case "GENERATED":
      return "border-[#3B8FF3]/40 bg-[#3B8FF3]/15 text-[#1E589B]";
    case "REJECTED":
    case "RETURNED":
    case "DELIVERY_FAILED":
      return "border-[#E05252]/40 bg-[#E05252]/15 text-[#9B2C2C]";
    case "RELEASED":
      return "border-[#34B1AA]/40 bg-[#34B1AA]/15 text-[#1E746F]";
    default:
      return "border-[#8A94A6]/40 bg-[#8A94A6]/15 text-[#4A5260]";
  }
}

function detailCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[2rem] border border-[#E2E8F0] bg-white p-6 shadow-sm sm:p-8">
      <h3 className="text-lg font-semibold text-[#1E1E2C]">{title}</h3>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function fieldRow(label: string, value: ReactNode) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
        {label}
      </p>
      <div className="mt-2 text-sm font-medium text-slate-900">{value}</div>
    </div>
  );
}

function safeReturnTo(value: string): string {
  if (value.startsWith("/")) {
    return value;
  }

  return "/staff/gmc-requests";
}

function initialActionFromMode(value: string): "APPROVE" | "RETURN" | "REJECT" {
  switch (value.toLowerCase()) {
    case "return":
      return "RETURN";
    case "reject":
      return "REJECT";
    case "approve":
    default:
      return "APPROVE";
  }
}

function outcomeText(request: {
  status: string;
  reviewNotes: string | null;
  returnReason: string | null;
  rejectionReason: string | null;
}) {
  switch (request.status) {
    case "RETURNED":
      return request.returnReason ?? request.reviewNotes ?? "No return note was recorded.";
    case "REJECTED":
      return (
        request.rejectionReason ?? request.reviewNotes ?? "No rejection reason was recorded."
      );
    case "APPROVED":
      return request.reviewNotes ?? "Approved after review.";
    case "GENERATED":
      return request.reviewNotes ?? "Certificate generated and ready for review.";
    case "RELEASED":
      return request.reviewNotes ?? "Released to the student.";
    case "DELIVERY_FAILED":
      return request.reviewNotes ?? "Certificate delivery failed and needs a retry.";
    default:
      return "Pending review.";
  }
}

export default async function StaffRequestReviewPage({
  params,
  searchParams,
}: StaffRequestReviewPageProps) {
  const { requestId } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const request = await prisma.gmcRequest.findUnique({
    where: { id: requestId },
    include: {
      student: true,
      reviewedBy: true,
      certificate: true,
      auditLogs: {
        orderBy: { timestamp: "asc" },
        include: { actor: true },
      },
    },
  });

  if (!request) {
    notFound();
  }

  const proofViewerKind = getFileViewerKind(request.paymentProofFileUrl);
  const proofFileUrl = getPrivateStorageDownloadUrl(request.paymentProofFileUrl);
  const returnTo = safeReturnTo(firstSearchParam(resolvedSearchParams.returnTo) || "/staff/gmc-requests");
  const mode = firstSearchParam(resolvedSearchParams.mode);
  const reviewSearchParams = new URLSearchParams();
  reviewSearchParams.set("returnTo", returnTo);
  const certificateReviewHref =
    request.status === "GENERATED" || request.status === "DELIVERY_FAILED"
      ? `/staff/gmc-requests/${request.id}/review?${reviewSearchParams.toString()}`
      : null;
  const studentRows = [
    {
      label: "Student ID",
      snapshot: request.studentId,
    },
    {
      label: "First Name",
      snapshot: request.studentFirstName,
    },
    {
      label: "Middle Initial",
      snapshot: request.studentMiddleInitial ?? "-",
    },
    {
      label: "Last Name",
      snapshot: request.studentLastName,
    },
    {
      label: "Course / Program",
      snapshot: request.studentCourseProgram,
    },
    {
      label: "Academic Year",
      snapshot: request.studentAcademicYear,
    },
    {
      label: "Email",
      snapshot: request.studentEmail,
    },
  ] as const;

  return (
    <section className="space-y-8">
      <div className="rounded-[2rem] border border-[#2D2D3F] bg-[#1E1E2C] p-6 shadow-xl sm:p-8">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-white">
              {request.requestReferenceNumber}
            </h2>
            <p className="mt-2 text-sm text-[#94A3B8]">
              Submitted on {formatBusinessDateTime(request.dateSubmitted)} by{" "}
              {fullName(
                request.studentFirstName,
                request.studentMiddleInitial,
                request.studentLastName,
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span
              className={[
                "inline-flex rounded-full border px-3 py-1 text-xs font-semibold",
                requestStatusClass(request.status),
              ].join(" ")}
            >
              {formatRequestStatusLabel(request.status)}
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
              {formatPurposeLabel(request.purposeOfRequest)}
            </span>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {fieldRow("Request ID", request.requestReferenceNumber)}
          {fieldRow("Payment Verification", formatPaymentVerificationLabel(request.paymentVerificationStatus))}
          {fieldRow(
            "Official Receipt Number",
            request.officialReceiptNumber ?? "Not recorded yet",
          )}
          {fieldRow("Reviewed By", request.reviewedBy?.name ?? "Pending review")}
          {fieldRow(
            "Certificate",
            request.certificate ? request.certificate.certificateNumber : "Not generated yet",
          )}
        </div>
      </div>

      <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-8">
          {detailCard({
            title: "Student Information",
            children: (
              <div className="grid gap-4 lg:grid-cols-2">
                <section className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-sm font-semibold text-slate-900">Request snapshot</p>
                  <dl className="mt-4 grid gap-3">
                    {studentRows.map((row) => (
                      <div
                        key={row.label}
                        className="flex flex-col gap-1 rounded-2xl bg-white px-4 py-3 shadow-sm"
                      >
                        <dt className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
                          {row.label}
                        </dt>
                        <dd className="text-sm font-medium text-slate-900">{row.snapshot}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              </div>
            ),
          })}

          {detailCard({
            title: "Uploaded Payment Proof",
            children: (
              <div className="space-y-4">
                <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-100">
                  {proofViewerKind === "image" ? (
                    <img
                      src={proofFileUrl}
                      alt={`Payment proof for ${request.requestReferenceNumber}`}
                      className="h-auto w-full object-contain"
                    />
                  ) : proofViewerKind === "pdf" ? (
                    <iframe
                      src={proofFileUrl}
                      title={`Payment proof for ${request.requestReferenceNumber}`}
                      className="h-[36rem] w-full"
                    />
                  ) : (
                    <div className="flex min-h-80 flex-col items-start justify-center gap-3 p-6">
                      <p className="text-sm text-slate-600">
                        This proof file can be opened directly in a new tab.
                      </p>
                      <a
                        href={proofFileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex rounded-2xl bg-[#1E1E2C] px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                      >
                        Open proof file
                      </a>
                    </div>
                  )}
                </div>
                <p className="text-sm text-slate-500">
                  File is stored securely and can be viewed through the secure preview above.
                </p>
              </div>
            ),
          })}

          {detailCard({
            title: "Audit Trail",
            children: (
              <div className="space-y-4">
                {request.auditLogs.length === 0 ? (
                  <p className="text-sm text-slate-500">No audit entries recorded yet.</p>
                ) : (
                  request.auditLogs.map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-[#1E1E2C]">{entry.action}</p>
                        <p className="text-xs text-slate-500">
                          {formatBusinessDateTime(entry.timestamp)}
                        </p>
                      </div>
                      <p className="mt-2 text-sm text-slate-600">
                        Actor: {entry.actor?.name ?? "System"}
                      </p>
                      {entry.notes ? (
                        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                          {entry.notes}
                        </p>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            ),
          })}
        </div>

        <div className="space-y-8">
          {detailCard({
            title: "Request Summary",
            children: (
              <dl className="grid gap-4">
                {fieldRow("Student Name", fullName(
                  request.studentFirstName,
                  request.studentMiddleInitial,
                  request.studentLastName,
                ))}
                {fieldRow("Course / Program", request.studentCourseProgram)}
                {fieldRow("Academic Year", request.studentAcademicYear)}
                {fieldRow("Email", request.studentEmail)}
                {fieldRow("Date Submitted", formatBusinessDateTime(request.dateSubmitted))}
                {fieldRow(
                  "Date Released",
                  request.dateReleased ? formatBusinessDateTime(request.dateReleased) : "Not released yet",
                )}
              </dl>
            ),
          })}

          {request.status !== "PENDING"
            ? detailCard({
                title: "Outcome Notes",
                children: (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
                        Status
                      </p>
                      <p className="mt-2 text-sm font-medium text-slate-900">
                        {formatRequestStatusLabel(request.status)}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
                        Notes / Reason
                      </p>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                        {outcomeText(request)}
                      </p>
                    </div>
                  </div>
                ),
              })
            : detailCard({
                title: "Review Status",
                children: (
                  <div className="space-y-4">
                    <p className="text-sm leading-7 text-slate-600">
                      This request is pending. Use the review controls below to mark the payment,
                      then approve, return, or reject the submission.
                    </p>
                    <div className="rounded-2xl border border-[#E0B50F]/30 bg-[#E0B50F]/10 p-4 text-sm text-[#8F7306]">
                      Approving this request unlocks certificate generation in the next phase.
                    </div>
                  </div>
                ),
              })}
        </div>
      </div>

      {request.status === "PENDING" ? (
        <StaffRequestReviewClient
          requestId={request.id}
          requestReferenceNumber={request.requestReferenceNumber}
          returnTo={returnTo}
          initialAction={initialActionFromMode(mode)}
          initialPaymentVerificationStatus={
            request.paymentVerificationStatus === "INVALID" ? "INVALID" : "VALID"
          }
          initialOfficialReceiptNumber={request.officialReceiptNumber ?? ""}
        />
      ) : (
        <section className="rounded-[2rem] border border-[#E2E8F0] bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.35em] text-[#F29F67]">
                Read Only
              </p>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-[#1E1E2C]">
                This request is already {formatRequestStatusLabel(request.status)}.
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                The review controls are disabled because the record has already moved past the
                pending stage.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {certificateReviewHref ? (
                <a
                  href={certificateReviewHref}
                  className="inline-flex rounded-2xl border border-[#3B8FF3]/30 bg-[#3B8FF3]/10 px-5 py-3 text-sm font-semibold text-[#1E589B] transition hover:bg-[#3B8FF3]/20"
                >
                  Open Certificate Review
                </a>
              ) : null}
              <a
                href={returnTo}
                className="inline-flex rounded-2xl bg-[#F29F67] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#e08e56] shadow-sm"
              >
                Back to Requests
              </a>
            </div>
          </div>
        </section>
      )}
    </section>
  );
}
