"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  formatBusinessDateTime,
  formatPaymentVerificationLabel,
  formatPurposeLabel,
  formatRequestStatusLabel,
} from "@/lib/gmc-request";
import { getPrivateStorageDownloadUrl } from "@/lib/storage/private-file-url";

type CertificateReviewAction = "EDIT" | "GENERATE" | "REJECT";

interface CertificateReviewDraft {
  request: {
    id: string;
    requestReferenceNumber: string;
    status:
      | "PENDING"
      | "APPROVED"
      | "GENERATED"
      | "REJECTED"
      | "RETURNED"
      | "RELEASED"
      | "DELIVERY_FAILED";
    studentEmail: string;
    purposeOfRequest:
      | "TRANSFER_OUT"
      | "EMPLOYMENT"
      | "SCHOLARSHIP"
      | "INTERNSHIP"
      | "BOARD_EXAM"
      | "OTHER";
    officialReceiptNumber: string | null;
    paymentVerificationStatus: "UNVERIFIED" | "VALID" | "INVALID";
    reviewNotes: string | null;
    dateSubmitted: string;
    dateReleased: string | null;
    reviewedByName: string | null;
    releaseDeliveryStatus: "PDF_AVAILABLE" | null;
  };
  certificate: {
    id: string;
    certificateNumber: string;
    studentFullName: string;
    studentIdNumber: string;
    courseProgram: string;
    academicYear: string;
    purposeOfCertificate: string;
    generatedPdfUrl: string | null;
    previewHtml: string;
    dateOfIssuance: string;
    authorizedSignatory: string;
    officeDesignation: string;
  } | null;
}

interface StaffCertificateReviewClientProps {
  initialDraft: CertificateReviewDraft;
  returnTo: string;
}

interface ReviewResponse {
  draft?: CertificateReviewDraft;
  fieldErrors?: Record<string, string>;
  formError?: string;
}

interface CertificateDraftFormState {
  studentFullName: string;
  studentIdNumber: string;
  courseProgram: string;
  academicYear: string;
  purposeOfCertificate: string;
  authorizedSignatory: string;
  officeDesignation: string;
}

const PURPOSE_OPTIONS = [
  "Transfer Out",
  "Employment",
  "Scholarship",
  "Internship",
  "Board Exam",
  "Other",
] as const;

function buildCertificateDraftState(
  certificate: CertificateReviewDraft["certificate"],
): CertificateDraftFormState {
  return {
    studentFullName: certificate?.studentFullName ?? "",
    studentIdNumber: certificate?.studentIdNumber ?? "",
    courseProgram: certificate?.courseProgram ?? "",
    academicYear: certificate?.academicYear ?? "",
    purposeOfCertificate: certificate?.purposeOfCertificate ?? PURPOSE_OPTIONS[0],
    authorizedSignatory: certificate?.authorizedSignatory ?? "SHEILA MARIE R. RELLES, MA",
    officeDesignation:
      certificate?.officeDesignation ?? "SDO Officer-in-Charge",
  };
}

function validateCertificateDraft(
  draft: CertificateDraftFormState,
): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  const studentIdPattern = /^\d{4}-\d{6}$/;

  if (!draft.studentFullName.trim()) {
    fieldErrors.studentFullName = "Student full name is required.";
  }

  if (!draft.studentIdNumber.trim()) {
    fieldErrors.studentIdNumber = "Student ID number is required.";
  } else if (!studentIdPattern.test(draft.studentIdNumber.trim())) {
    fieldErrors.studentIdNumber = "Use the institutional ID format 2021-123456.";
  }

  if (!draft.courseProgram.trim()) {
    fieldErrors.courseProgram = "Course / program is required.";
  }

  if (!draft.academicYear.trim()) {
    fieldErrors.academicYear = "Academic year is required.";
  }

  if (!draft.purposeOfCertificate.trim()) {
    fieldErrors.purposeOfCertificate = "Purpose of certificate is required.";
  }

  if (!draft.authorizedSignatory.trim()) {
    fieldErrors.authorizedSignatory = "Authorized signatory is required.";
  }

  if (!draft.officeDesignation.trim()) {
    fieldErrors.officeDesignation = "Office designation is required.";
  }

  return fieldErrors;
}

function getActiveStep(status: CertificateReviewDraft["request"]["status"]): number {
  switch (status) {
    case "RELEASED":
      return 3;
    case "GENERATED":
    case "DELIVERY_FAILED":
      return 2;
    case "APPROVED":
      return 1;
    case "RETURNED":
    case "REJECTED":
      return 1;
    case "PENDING":
    default:
      return 0;
  }
}

function Stepper({
  activeStep,
}: {
  activeStep: number;
}) {
  const steps = ["Submitted", "Verified", "Generated", "Released"];

  return (
    <div className="grid gap-3 md:grid-cols-4">
      {steps.map((step, index) => {
        const isActive = index === activeStep;
        const isCompleted = index < activeStep;

        return (
          <div
            key={step}
            className={[
              "rounded-2xl border px-4 py-3 transition",
              isActive
                ? "border-[#3B8FF3]/40 bg-[#3B8FF3]/15 text-[#1E589B] shadow-sm"
                : isCompleted
                  ? "border-[#34B1AA]/40 bg-[#34B1AA]/15 text-[#1E746F]"
                  : "border-slate-200 bg-slate-50 text-slate-500",
            ].join(" ")}
          >
            <div className="flex items-center gap-3">
              <div
                className={[
                  "flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold",
                  isActive
                    ? "bg-[#3B8FF3] text-white"
                    : isCompleted
                      ? "bg-[#34B1AA] text-white"
                      : "bg-slate-200 text-slate-600",
                ].join(" ")}
              >
                {index + 1}
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.25em] opacity-70">Stage</p>
                <p className="text-sm font-semibold">{step}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Card({
  title,
  children,
  className = "",
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={["rounded-[2rem] border border-[#E2E8F0] bg-white p-6 shadow-sm sm:p-8", className].join(" ")}>
      <h3 className="text-lg font-semibold text-[#1E1E2C]">{title}</h3>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function detailItem(label: string, value: string) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}

function inputClassName(hasError: boolean): string {
  return [
    "mt-2 block w-full rounded-2xl border bg-white px-4 py-3 text-sm text-slate-900 outline-none transition",
    hasError
      ? "border-[#E05252] focus:border-[#E05252] focus:ring-4 focus:ring-[#E05252]/15"
      : "border-slate-300 focus:border-[#3B8FF3] focus:ring-4 focus:ring-[#3B8FF3]/15",
  ].join(" ");
}

export default function StaffCertificateReviewClient({
  initialDraft,
  returnTo,
}: StaffCertificateReviewClientProps) {
  const router = useRouter();
  const [draft, setDraft] = useState(initialDraft);
  const [reviewNotes, setReviewNotes] = useState(
    initialDraft.request.reviewNotes ?? "",
  );
  const [editDraft, setEditDraft] = useState<CertificateDraftFormState>(
    buildCertificateDraftState(initialDraft.certificate),
  );
  const [rejectionReason, setRejectionReason] = useState("");
  const [confirmationChecked, setConfirmationChecked] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const activeStep = getActiveStep(draft.request.status);
  const certificate = draft.certificate;
  const isReleased = draft.request.status === "RELEASED";
  const isDeliveryFailed = draft.request.status === "DELIVERY_FAILED";
  const certificateDownloadName = certificate
    ? `${certificate.studentFullName}_${certificate.certificateNumber}.pdf`
    : "";
  const certificateDownloadUrl = certificate
    ? getPrivateStorageDownloadUrl(certificate.generatedPdfUrl ?? "", certificateDownloadName)
    : "";
  const releaseDeliveryLabel =
    draft.request.releaseDeliveryStatus === "PDF_AVAILABLE"
      ? "Released — PDF Available for Download"
      : isReleased
        ? "Released"
        : null;

  const syncDraft = (nextDraft: CertificateReviewDraft) => {
    setDraft(nextDraft);
    setReviewNotes(nextDraft.request.reviewNotes ?? "");
    setEditDraft(buildCertificateDraftState(nextDraft.certificate));
    setRejectionReason("");
    setIsRejecting(false);
    setIsEditing(false);
    setConfirmationChecked(false);
  };

  const submitAction = async (
    action: CertificateReviewAction,
    payload: Record<string, unknown>,
  ) => {
    setIsSubmitting(true);
    setFormError(null);
    setFieldErrors({});

    try {
      const response = await fetch(
        `/api/staff/gmc-requests/${draft.request.id}/certificate-review`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action,
            reviewNotes,
            ...payload,
          }),
        },
      );

      const body = (await response.json().catch(() => null)) as ReviewResponse | null;

      if (!response.ok) {
        if (response.status === 401) {
          router.push("/staff/login");
          return;
        }

        setFormError(body?.formError ?? "Unable to submit the certificate review.");
        setFieldErrors(body?.fieldErrors ?? {});
        return;
      }

      if (!body?.draft) {
        setFormError("The review completed, but refreshed certificate data was missing.");
        return;
      }

      syncDraft(body.draft);
      setFormError(body.formError ?? null);

      const generatedPdfUrl = body.draft.certificate?.generatedPdfUrl;
      if (action === "GENERATE" && generatedPdfUrl && body.draft.certificate) {
        const generatedCertificate = body.draft.certificate;
        const downloadName = `${generatedCertificate.studentFullName}_${generatedCertificate.certificateNumber}.pdf`;
        const downloadLink = document.createElement("a");
        downloadLink.href = getPrivateStorageDownloadUrl(
          generatedPdfUrl,
          downloadName,
        );
        downloadLink.download = downloadName;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        downloadLink.remove();
      }

      if (action === "REJECT") {
        router.push(returnTo || "/staff/gmc-requests");
      }
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Unable to submit the certificate review right now.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSave = async () => {
    const nextFieldErrors = validateCertificateDraft(editDraft);
    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      setFormError("Please correct the highlighted certificate fields.");
      return;
    }

    await submitAction("EDIT", {
      studentFullName: editDraft.studentFullName.trim(),
      studentIdNumber: editDraft.studentIdNumber.trim(),
      courseProgram: editDraft.courseProgram.trim(),
      academicYear: editDraft.academicYear.trim(),
      purposeOfCertificate: editDraft.purposeOfCertificate.trim(),
      authorizedSignatory: editDraft.authorizedSignatory.trim(),
      officeDesignation: editDraft.officeDesignation.trim(),
    });
  };

  const handleGenerate = async () => {
    if (!confirmationChecked) {
      setFormError("Confirm the certificate before generating the PDF.");
      return;
    }

    await submitAction("GENERATE", {
      confirmed: true,
    });
  };

  const handleReject = async () => {
    const trimmedReason = rejectionReason.trim();
    if (!trimmedReason) {
      setFieldErrors({ rejectionReason: "A rejection reason is required." });
      setFormError("Please provide a rejection reason.");
      return;
    }

    await submitAction("REJECT", {
      rejectionReason: trimmedReason,
    });
  };

  return (
    <section className="space-y-8">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
              <Link
                href="/staff/gmc-requests"
                className="font-medium text-slate-600 transition hover:text-slate-950"
              >
                GMC Requests
              </Link>
              <span aria-hidden="true">&rsaquo;</span>
              <span className="font-medium text-slate-600">
                Request #{certificate?.certificateNumber ?? draft.request.requestReferenceNumber}
              </span>
              <span aria-hidden="true">&rsaquo;</span>
              <span className="text-slate-950">Review</span>
            </div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
              Review Certificate
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Final human approval before release. The preview below is rendered from the stored
              certificate template.
            </p>
          </div>

          <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">
            {formatRequestStatusLabel(draft.request.status)}
          </span>
        </div>
      </div>

      <Stepper activeStep={activeStep} />

      {formError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {formError}
        </div>
      ) : null}

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1.5fr)_minmax(340px,0.85fr)]">
        <div className="space-y-8">
          <Card title="Final Certificate Review">
            <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-slate-100">
              <iframe
                title={`Certificate preview ${certificate?.certificateNumber ?? ""}`}
                srcDoc={certificate?.previewHtml ?? ""}
                className="min-h-[48rem] w-full bg-white"
              />
            </div>
            {certificate?.generatedPdfUrl ? (
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <a
                  href={certificateDownloadUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Download Certificate PDF
                </a>
              </div>
            ) : null}
            {!certificate?.generatedPdfUrl ? (
              <p className="mt-4 text-sm text-slate-500">
                The final PDF will be generated when the certificate is approved for release.
              </p>
            ) : (
              <p className="mt-4 text-sm text-slate-500">
                The generated PDF is ready for staff download.
              </p>
            )}
          </Card>

          {isEditing ? (
            <Card title="Edit Certificate">
              <div className="grid gap-5 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-slate-700">
                    Student Full Name
                    <input
                      type="text"
                      value={editDraft.studentFullName}
                      onChange={(event) =>
                        setEditDraft((current) => ({
                          ...current,
                          studentFullName: event.target.value,
                        }))
                      }
                      className={inputClassName(Boolean(fieldErrors.studentFullName))}
                    />
                  </label>
                  {fieldErrors.studentFullName ? (
                    <p className="mt-2 text-sm text-rose-600">{fieldErrors.studentFullName}</p>
                  ) : null}
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Student ID Number
                    <input
                      type="text"
                      value={editDraft.studentIdNumber}
                      onChange={(event) =>
                        setEditDraft((current) => ({
                          ...current,
                          studentIdNumber: event.target.value,
                        }))
                      }
                      className={inputClassName(Boolean(fieldErrors.studentIdNumber))}
                    />
                  </label>
                  {fieldErrors.studentIdNumber ? (
                    <p className="mt-2 text-sm text-rose-600">{fieldErrors.studentIdNumber}</p>
                  ) : null}
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Course / Program
                    <input
                      type="text"
                      value={editDraft.courseProgram}
                      onChange={(event) =>
                        setEditDraft((current) => ({
                          ...current,
                          courseProgram: event.target.value,
                        }))
                      }
                      className={inputClassName(Boolean(fieldErrors.courseProgram))}
                    />
                  </label>
                  {fieldErrors.courseProgram ? (
                    <p className="mt-2 text-sm text-rose-600">{fieldErrors.courseProgram}</p>
                  ) : null}
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Academic Year
                    <input
                      type="text"
                      value={editDraft.academicYear}
                      onChange={(event) =>
                        setEditDraft((current) => ({
                          ...current,
                          academicYear: event.target.value,
                        }))
                      }
                      className={inputClassName(Boolean(fieldErrors.academicYear))}
                    />
                  </label>
                  {fieldErrors.academicYear ? (
                    <p className="mt-2 text-sm text-rose-600">{fieldErrors.academicYear}</p>
                  ) : null}
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Purpose of Certificate
                    <select
                      value={editDraft.purposeOfCertificate}
                      onChange={(event) =>
                        setEditDraft((current) => ({
                          ...current,
                          purposeOfCertificate: event.target.value,
                        }))
                      }
                      className={inputClassName(Boolean(fieldErrors.purposeOfCertificate))}
                    >
                      {PURPOSE_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                  {fieldErrors.purposeOfCertificate ? (
                    <p className="mt-2 text-sm text-rose-600">
                      {fieldErrors.purposeOfCertificate}
                    </p>
                  ) : null}
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Authorized Signatory
                    <input
                      type="text"
                      value={editDraft.authorizedSignatory}
                      onChange={(event) =>
                        setEditDraft((current) => ({
                          ...current,
                          authorizedSignatory: event.target.value,
                        }))
                      }
                      className={inputClassName(Boolean(fieldErrors.authorizedSignatory))}
                    />
                  </label>
                  {fieldErrors.authorizedSignatory ? (
                    <p className="mt-2 text-sm text-rose-600">
                      {fieldErrors.authorizedSignatory}
                    </p>
                  ) : null}
                </div>

                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-slate-700">
                    Office Designation
                    <input
                      type="text"
                      value={editDraft.officeDesignation}
                      onChange={(event) =>
                        setEditDraft((current) => ({
                          ...current,
                          officeDesignation: event.target.value,
                        }))
                      }
                      className={inputClassName(Boolean(fieldErrors.officeDesignation))}
                    />
                  </label>
                  {fieldErrors.officeDesignation ? (
                    <p className="mt-2 text-sm text-rose-600">{fieldErrors.officeDesignation}</p>
                  ) : null}
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleEditSave}
                  disabled={isSubmitting}
                  className="inline-flex rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmitting ? "Saving..." : "Save Edits"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setFieldErrors({});
                    setFormError(null);
                    setEditDraft(buildCertificateDraftState(certificate));
                  }}
                  className="inline-flex rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  Cancel
                </button>
              </div>
            </Card>
          ) : null}
        </div>

        <div className="space-y-8">
          <Card title="Delivery Information">
            <div className="space-y-4">
              {releaseDeliveryLabel ? (
                <div
                  className={[
                    "rounded-2xl border px-4 py-3 text-sm font-semibold",
                    draft.request.releaseDeliveryStatus === "PDF_AVAILABLE"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                      : "border-amber-200 bg-amber-50 text-amber-950",
                  ].join(" ")}
                >
                  {releaseDeliveryLabel}
                </div>
              ) : null}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
                  Student Email
                </p>
                <p className="mt-2 break-all text-sm font-medium text-slate-900">
                  {draft.request.studentEmail}
                </p>
              </div>
            </div>
          </Card>

          <Card title="Request Details">
            <div className="grid gap-4">
              {detailItem("Request Submitted", formatBusinessDateTime(draft.request.dateSubmitted))}
              {detailItem(
                "Purpose",
                formatPurposeLabel(draft.request.purposeOfRequest),
              )}
              {detailItem(
                "Payment Verification",
                formatPaymentVerificationLabel(draft.request.paymentVerificationStatus),
              )}
              {detailItem(
                "Official Receipt Number",
                draft.request.officialReceiptNumber ?? "Not recorded yet",
              )}
              {detailItem(
                "Clearance Status",
                formatRequestStatusLabel(draft.request.status),
              )}
              {detailItem(
                "Reviewed By",
                draft.request.reviewedByName ?? "Pending staff review",
              )}
              {detailItem(
                "Date Released",
                draft.request.dateReleased
                  ? formatBusinessDateTime(draft.request.dateReleased)
                  : "Not released yet",
              )}
            </div>
          </Card>

          <Card title="Review Notes">
            {isReleased ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
                  Internal Notes
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                  {reviewNotes || "No internal review notes were recorded."}
                </p>
              </div>
            ) : (
              <label className="text-sm font-medium text-slate-700">
                Internal notes
                <textarea
                  rows={6}
                  value={reviewNotes}
                  onChange={(event) => setReviewNotes(event.target.value)}
                  placeholder="Optional notes for the certificate record."
                  className="mt-2 block w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-amber-400 focus:ring-4 focus:ring-amber-400/15"
                />
              </label>
            )}
            <p className="mt-3 text-sm text-slate-500">
              These notes stay internal and are not included in the certificate PDF.
            </p>
          </Card>

          {!isReleased ? (
            <Card title="Actions">
              <div className="space-y-5">
                {isDeliveryFailed ? (
                  <div className="rounded-3xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                    PDF generation failed on the previous attempt. Review the reason in the audit
                    trail and retry after confirming the certificate details.
                  </div>
                ) : null}

                {certificate?.generatedPdfUrl ? (
                  <div className="rounded-3xl border border-blue-200 bg-blue-50 px-4 py-4 text-sm text-blue-950">
                    The PDF has been generated, downloaded, and released. Download it again
                    below whenever a replacement copy is needed.
                  </div>
                ) : null}

                <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={confirmationChecked}
                    onChange={(event) => setConfirmationChecked(event.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-amber-500 focus:ring-amber-400"
                  />
                  <span className="text-sm text-slate-700">
                    "I confirm that the above certificate is accurate and ready to generate and release."
                  </span>
                </label>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={!confirmationChecked || isSubmitting}
                    onClick={handleGenerate}
                    className="inline-flex rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isDeliveryFailed ? "Retry PDF Generation and Release" : "Approve & Generate Certificate"}
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => {
                      setIsEditing((current) => !current);
                      setIsRejecting(false);
                      setFieldErrors({});
                      setFormError(null);
                    }}
                    className="inline-flex rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    Edit Certificate
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => {
                      setIsRejecting((current) => !current);
                      setIsEditing(false);
                      setFieldErrors({});
                      setFormError(null);
                    }}
                    className="inline-flex rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    Reject Request
                  </button>
                </div>

                {isRejecting ? (
                  <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5">
                    <label className="text-sm font-medium text-rose-900">
                      Rejection Reason
                      <textarea
                        rows={5}
                        value={rejectionReason}
                        onChange={(event) => setRejectionReason(event.target.value)}
                        placeholder="Describe why the certificate cannot be released."
                        className="mt-2 block w-full rounded-2xl border border-rose-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15"
                      />
                    </label>
                    {fieldErrors.rejectionReason ? (
                      <p className="mt-2 text-sm text-rose-700">
                        {fieldErrors.rejectionReason}
                      </p>
                    ) : null}
                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={handleReject}
                        className="inline-flex rounded-2xl bg-rose-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {isSubmitting ? "Submitting..." : "Confirm Rejection"}
                      </button>
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => setIsRejecting(false)}
                        className="inline-flex rounded-2xl border border-rose-200 bg-white px-5 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </Card>
          ) : (
            <Card title="Release Status">
              <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-950">
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-700">
                  {releaseDeliveryLabel ?? "Released"}
                </p>
                <p className="mt-2 text-sm leading-6">
                  This certificate has been approved and released. Download the generated PDF
                  and provide it to the student through the office’s approved process.
                </p>
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                {certificate?.generatedPdfUrl ? (
                  <a
                    href={certificateDownloadUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex rounded-2xl bg-amber-400 px-5 py-3 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-amber-300"
                  >
                    Download Certificate PDF
                  </a>
                ) : null}
                <Link
                  href={returnTo || "/staff/gmc-requests"}
                  className="inline-flex rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Back to Requests
                </Link>
              </div>
            </Card>
          )}
        </div>
      </div>
    </section>
  );
}
