"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  formatBusinessDateTime,
  formatPurposeLabel,
  formatRequestStatusLabel,
  getFileViewerKind,
} from "@/lib/gmc-request";
import { getPrivateStorageDownloadUrl } from "@/lib/storage/private-file-url";

type WizardStep = 1 | 2 | 3;
type ViolationChoice = "NO_VIOLATION" | "HAS_VIOLATION";

interface ProcessDraft {
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
    term: string | null;
    officialReceiptNumber: string | null;
    paymentProofFileUrl: string | null;
    hasViolationRecord: boolean;
    reviewNotes: string | null;
    dateSubmitted: string;
    dateReleased: string | null;
    reviewedByName: string | null;
    releaseDeliveryStatus: "PDF_AVAILABLE" | null;
    studentFullName: string;
    studentId: string;
    studentCourseProgram: string;
    studentAcademicYear: string;
    purposeOfCertificate: string;
  };
  invoiceNumberDuplicate: {
    exists: boolean;
    requestReferenceNumber: string | null;
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

interface ProcessResponse {
  draft?: ProcessDraft;
  fieldErrors?: Record<string, string>;
  formError?: string;
}

interface StaffRequestProcessModalProps {
  requestId: string;
  requestReferenceNumber: string;
}

const PURPOSE_OPTIONS = [
  "Transfer Out",
  "Employment",
  "Scholarship",
  "Internship",
  "Board Exam",
  "Other",
] as const;

const REJECT_CATEGORY_OPTIONS = [
  { value: "WRONG_INFORMATION", label: "Wrong Information" },
  { value: "DUPLICATE_REQUEST", label: "Duplicate Request" },
  { value: "INVALID_INVOICE_NUMBER", label: "Invalid Invoice Number" },
  { value: "OTHER", label: "Other" },
] as const;

const STEP_LABELS: Record<WizardStep, string> = {
  1: "Validate Request",
  2: "Review Certificate",
  3: "Release",
};

const STUDENT_ID_PATTERN = /^\d{4}-\d{1,10}$/;

function buildFormState(draft: ProcessDraft) {
  return {
    studentFullName: draft.request.studentFullName,
    studentIdNumber: draft.request.studentId,
    courseProgram: draft.request.studentCourseProgram,
    academicYear: draft.request.studentAcademicYear,
    term: draft.request.term ?? "",
    purposeOfCertificate: draft.request.purposeOfCertificate,
    officialReceiptNumber: draft.request.officialReceiptNumber ?? "",
  };
}

function validateFormState(form: ReturnType<typeof buildFormState>): Record<string, string> {
  const fieldErrors: Record<string, string> = {};

  if (!form.studentFullName.trim()) {
    fieldErrors.studentFullName = "Student full name is required.";
  }

  if (!form.studentIdNumber.trim()) {
    fieldErrors.studentIdNumber = "Student ID number is required.";
  } else if (!STUDENT_ID_PATTERN.test(form.studentIdNumber.trim())) {
    fieldErrors.studentIdNumber =
      "Student ID must be in the format YEAR-NUMBER (4-digit year, hyphen, then up to 10 digits).";
  }

  if (!form.courseProgram.trim()) {
    fieldErrors.courseProgram = "Course / program is required.";
  }

  if (!form.academicYear.trim()) {
    fieldErrors.academicYear = "Academic year is required.";
  }

  if (!form.term.trim()) {
    fieldErrors.term = "Term is required.";
  }

  if (!PURPOSE_OPTIONS.includes(form.purposeOfCertificate as (typeof PURPOSE_OPTIONS)[number])) {
    fieldErrors.purposeOfCertificate = "Select a valid purpose of certificate.";
  }

  if (!form.officialReceiptNumber.trim()) {
    fieldErrors.officialReceiptNumber = "Official receipt number is required.";
  }

  return fieldErrors;
}

function fieldInputClassName(hasError: boolean): string {
  return [
    "mt-2 block w-full rounded-2xl border bg-white px-4 py-3 text-base text-slate-900 outline-none transition",
    hasError
      ? "border-[#E05252] focus:border-[#E05252] focus:ring-4 focus:ring-[#E05252]/15"
      : "border-slate-300 focus:border-[#3B8FF3] focus:ring-4 focus:ring-[#3B8FF3]/15",
  ].join(" ");
}

export default function StaffRequestProcessModal({
  requestId,
  requestReferenceNumber,
}: StaffRequestProcessModalProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [draft, setDraft] = useState<ProcessDraft | null>(null);
  const [step, setStep] = useState<WizardStep>(1);
  const [form, setForm] = useState<ReturnType<typeof buildFormState>>({
    studentFullName: "",
    studentIdNumber: "",
    courseProgram: "",
    academicYear: "",
    term: "",
    purposeOfCertificate: PURPOSE_OPTIONS[0],
    officialReceiptNumber: "",
  });
  const [violationChoice, setViolationChoice] = useState<ViolationChoice | null>(null);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectCategory, setRejectCategory] =
    useState<(typeof REJECT_CATEGORY_OPTIONS)[number]["value"] | null>(null);
  const [rejectOtherText, setRejectOtherText] = useState("");
  const [isShowingReleaseConfirm, setIsShowingReleaseConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

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

  const openModal = async () => {
    setIsOpen(true);
    setLoadError(null);
    setIsLoading(true);
    setStep(1);
    setDraft(null);
    setViolationChoice(null);
    setIsRejecting(false);
    setRejectCategory(null);
    setRejectOtherText("");
    setIsShowingReleaseConfirm(false);
    setFormError(null);
    setFieldErrors({});

    try {
      const response = await fetch(
        `/api/staff/gmc-requests/${requestId}/process`,
        { method: "GET" },
      );
      const body = (await response.json().catch(() => null)) as ProcessResponse | null;

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

      if (!body?.draft) {
        setLoadError("The request could not be loaded.");
        return;
      }

      setDraft(body.draft);
      setForm(buildFormState(body.draft));
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

  const closeModal = () => {
    setIsOpen(false);
    setDraft(null);
    setFormError(null);
    setFieldErrors({});
  };

  const submitProcess = useCallback(
    async (
      action: "CONFIRM" | "REJECT" | "RELEASE",
      payload: Record<string, unknown>,
    ): Promise<ProcessResponse | null> => {
      setIsSubmitting(true);
      setFormError(null);
      setFieldErrors({});

      try {
        const response = await fetch(
          `/api/staff/gmc-requests/${requestId}/process`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action, ...payload }),
          },
        );

        const body = (await response.json().catch(() => null)) as ProcessResponse | null;

        if (!response.ok) {
          if (response.status === 401) {
            router.push("/staff/login");
            return null;
          }
          setFormError(body?.formError ?? "Unable to process the request.");
          setFieldErrors(body?.fieldErrors ?? {});
          return null;
        }

        return body;
      } catch (error) {
        setFormError(
          error instanceof Error
            ? error.message
            : "Unable to process the request right now.",
        );
        return null;
      } finally {
        setIsSubmitting(false);
      }
    },
    [requestId, router],
  );

  const handleConfirm = async () => {
    const nextFieldErrors = validateFormState(form);
    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      setFormError("Please correct the highlighted fields.");
      return;
    }

    if (!violationChoice) {
      setFormError("Choose whether the student has a violation record.");
      return;
    }

    const body = await submitProcess("CONFIRM", {
      studentFullName: form.studentFullName.trim(),
      studentIdNumber: form.studentIdNumber.trim(),
      courseProgram: form.courseProgram.trim(),
      academicYear: form.academicYear.trim(),
      term: form.term.trim(),
      purposeOfCertificate: form.purposeOfCertificate,
      officialReceiptNumber: form.officialReceiptNumber.trim(),
      hasViolationRecord: violationChoice === "HAS_VIOLATION",
    });

    if (!body?.draft) {
      return;
    }

    setDraft(body.draft);
    setStep(2);
  };

  const handleEdit = () => {
    setStep(1);
    setFormError(null);
    setFieldErrors({});
    if (draft) {
      setForm(buildFormState(draft));
    }
  };

  const handleRelease = async () => {
    const body = await submitProcess("RELEASE", { confirmed: true });

    if (body?.draft) {
      setDraft(body.draft);
      setStep(3);
      setIsShowingReleaseConfirm(false);
    }
  };

  const handleReject = async () => {
    if (!rejectCategory) {
      setFieldErrors({ rejectionReason: "Choose a rejection reason." });
      setFormError("Please choose a rejection reason.");
      return;
    }

    let reason = "";
    if (rejectCategory === "OTHER") {
      reason = rejectOtherText.trim();
      if (!reason) {
        setFieldErrors({ rejectionReason: "Describe the rejection reason." });
        setFormError("Please describe the rejection reason.");
        return;
      }
      reason = `Other: ${reason}`;
    } else {
      reason =
        REJECT_CATEGORY_OPTIONS.find(
          (option) => option.value === rejectCategory,
        )?.label ?? rejectCategory;
    }

    const body = await submitProcess("REJECT", { rejectionReason: reason });

    if (!body?.draft) {
      return;
    }

    closeModal();
    router.refresh();
  };

  const certificate = draft?.certificate;
  const certificateDownloadName = certificate
    ? `${certificate.studentFullName}_${certificate.certificateNumber}.pdf`
    : "";
  const certificateDownloadUrl = certificate?.generatedPdfUrl
    ? getPrivateStorageDownloadUrl(
        certificate.generatedPdfUrl,
        certificateDownloadName,
      )
    : "";

  const renderStepIndicator = () => {
    const label = STEP_LABELS[step];

    return (
      <div className="border-b border-slate-200 px-6 py-5 sm:px-8">
        <p className="text-xs font-bold uppercase tracking-[0.35em] text-[#F29F67]">
          Guided Review
        </p>
        <p className="mt-1 text-2xl font-bold tracking-tight text-[#1E1E2C]">
          Step {step} of 3: {label}
        </p>
      </div>
    );
  };

  const renderRejectPanel = () => {
    if (!isRejecting) {
      return null;
    }

    return (
      <div className="mt-6 rounded-3xl border border-[#E05252]/30 bg-[#E05252]/5 p-6">
        <p className="text-lg font-semibold text-[#9B2C2C]">Reject Request</p>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          Choose the reason for rejecting this request. The student will be
          notified of this decision.
        </p>

        <div className="mt-5 grid gap-3">
          {REJECT_CATEGORY_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={[
                "flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-4 text-sm font-medium transition",
                rejectCategory === option.value
                  ? "border-[#E05252] bg-white text-[#1E1E2C]"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
              ].join(" ")}
            >
              <input
                type="radio"
                name="rejectCategory"
                value={option.value}
                checked={rejectCategory === option.value}
                onChange={() => {
                  setRejectCategory(option.value);
                  setFieldErrors((current) => ({
                    ...current,
                    rejectionReason: "",
                  }));
                }}
                className="mt-1 h-4 w-4 border-slate-300 text-[#E05252] focus:ring-[#E05252]"
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>

        {rejectCategory === "OTHER" ? (
          <label className="mt-4 block">
            <span className="text-sm font-medium text-slate-700">
              Describe the reason
            </span>
            <textarea
              rows={3}
              value={rejectOtherText}
              onChange={(event) => setRejectOtherText(event.target.value)}
              placeholder="Explain why this request cannot be accepted."
              className="mt-2 block w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#E05252] focus:ring-4 focus:ring-[#E05252]/15"
            />
          </label>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleReject}
            className="inline-flex rounded-2xl bg-[#E05252] px-6 py-3 text-base font-semibold text-white transition hover:bg-[#c43e3e] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Submitting..." : "Confirm Rejection"}
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => setIsRejecting(false)}
            className="inline-flex rounded-2xl border border-slate-300 bg-white px-6 py-3 text-base font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  };

  const renderReleaseConfirm = () => {
    if (!isShowingReleaseConfirm) {
      return null;
    }

    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-lg rounded-[2rem] border border-slate-200 bg-white p-8 shadow-2xl">
          <p className="text-2xl font-bold tracking-tight text-[#1E1E2C]">
            Release this certificate?
          </p>
          <p className="mt-3 text-base leading-7 text-slate-600">
            Please confirm all information on this certificate is correct before
            releasing. This action cannot be undone.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleRelease}
              className="inline-flex rounded-2xl bg-emerald-600 px-6 py-3 text-base font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Releasing..." : "Yes, Release"}
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setIsShowingReleaseConfirm(false)}
              className="inline-flex rounded-2xl border border-slate-300 bg-white px-6 py-3 text-base font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70"
            >
              No, Go Back
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderStep1 = () => {
    if (!draft) {
      return null;
    }

    return (
      <div className="px-6 py-6 sm:px-8">
        <p className="text-sm leading-6 text-slate-600">
          Review the information below and correct any field that needs to be
          fixed. The certificate will be generated with the confirmed details.
        </p>

        {formError ? (
          <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {formError}
          </div>
        ) : null}

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="text-base font-medium text-slate-700">
              Student full name
              <input
                type="text"
                value={form.studentFullName}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    studentFullName: event.target.value,
                  }))
                }
                className={fieldInputClassName(Boolean(fieldErrors.studentFullName))}
              />
            </label>
            {fieldErrors.studentFullName ? (
              <p className="mt-2 text-sm text-rose-600">
                {fieldErrors.studentFullName}
              </p>
            ) : null}
          </div>

          <div>
            <label className="text-base font-medium text-slate-700">
              Student ID number
              <input
                type="text"
                value={form.studentIdNumber}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    studentIdNumber: event.target.value,
                  }))
                }
                className={fieldInputClassName(Boolean(fieldErrors.studentIdNumber))}
              />
            </label>
            {fieldErrors.studentIdNumber ? (
              <p className="mt-2 text-sm text-rose-600">
                {fieldErrors.studentIdNumber}
              </p>
            ) : null}
          </div>

          <div>
            <label className="text-base font-medium text-slate-700">
              Course / program
              <input
                type="text"
                value={form.courseProgram}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    courseProgram: event.target.value,
                  }))
                }
                className={fieldInputClassName(Boolean(fieldErrors.courseProgram))}
              />
            </label>
            {fieldErrors.courseProgram ? (
              <p className="mt-2 text-sm text-rose-600">
                {fieldErrors.courseProgram}
              </p>
            ) : null}
          </div>

          <div>
            <label className="text-base font-medium text-slate-700">
              Term
              <input
                type="text"
                value={form.term}
                onChange={(event) =>
                  setForm((current) => ({ ...current, term: event.target.value }))
                }
                placeholder="e.g. Term 1"
                className={fieldInputClassName(Boolean(fieldErrors.term))}
              />
            </label>
            {fieldErrors.term ? (
              <p className="mt-2 text-sm text-rose-600">{fieldErrors.term}</p>
            ) : null}
          </div>

          <div>
            <label className="text-base font-medium text-slate-700">
              Academic year
              <input
                type="text"
                value={form.academicYear}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    academicYear: event.target.value,
                  }))
                }
                className={fieldInputClassName(Boolean(fieldErrors.academicYear))}
              />
            </label>
            {fieldErrors.academicYear ? (
              <p className="mt-2 text-sm text-rose-600">
                {fieldErrors.academicYear}
              </p>
            ) : null}
          </div>

          <div>
            <label className="text-base font-medium text-slate-700">
              Purpose of certificate
              <select
                value={form.purposeOfCertificate}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    purposeOfCertificate: event.target.value,
                  }))
                }
                className={fieldInputClassName(
                  Boolean(fieldErrors.purposeOfCertificate),
                )}
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

          <div className="md:col-span-2">
            <label className="text-base font-medium text-slate-700">
              Official receipt number
              <input
                type="text"
                value={form.officialReceiptNumber}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    officialReceiptNumber: event.target.value,
                  }))
                }
                placeholder="e.g. INV01-12345678901"
                className={fieldInputClassName(
                  Boolean(fieldErrors.officialReceiptNumber),
                )}
              />
            </label>
            {fieldErrors.officialReceiptNumber ? (
              <p className="mt-2 text-sm text-rose-600">
                {fieldErrors.officialReceiptNumber}
              </p>
            ) : (
              <p className="mt-2 text-sm text-slate-500">
                The student-entered invoice / receipt number is pre-filled below.
                Confirm it against the payment record or correct it if needed.
              </p>
            )}

            {draft?.invoiceNumberDuplicate?.exists ? (
              <div className="mt-4 rounded-2xl border border-amber-400/60 bg-amber-50 px-4 py-3">
                <p className="text-sm font-semibold text-amber-900">
                  Warning: This invoice number has already been used on another request
                </p>
                <p className="mt-1 text-sm leading-6 text-amber-900/90">
                  This invoice number is already on request{" "}
                  <span className="font-semibold">
                    {draft.invoiceNumberDuplicate.requestReferenceNumber ?? "another request"}
                  </span>
                  . Please verify this before proceeding.
                </p>
              </div>
            ) : null}

            {draft?.request.paymentProofFileUrl ? (
              <div className="mt-4">
                <p className="text-sm font-medium text-slate-700">
                  Student-Submitted Receipt Photo
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Cross-check the typed invoice number against the actual receipt image below.
                </p>
                {(() => {
                  const viewerKind = getFileViewerKind(draft.request.paymentProofFileUrl);
                  const proofUrl = getPrivateStorageDownloadUrl(draft.request.paymentProofFileUrl);
                  return (
                    <div className="mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                      {viewerKind === "image" ? (
                        <img
                          src={proofUrl}
                          alt="Payment proof receipt"
                          className="h-auto w-full object-contain"
                        />
                      ) : (
                        <div className="flex min-h-40 flex-col items-start justify-center gap-2 p-4">
                          <a
                            href={proofUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex rounded-2xl bg-[#1E1E2C] px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                          >
                            Open receipt file
                          </a>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-6">
          <p className="text-base font-semibold text-[#1E1E2C]">
            Violation Record
          </p>
          <p className="mt-1 text-sm text-slate-600">
            This determines the wording printed on the certificate. No choice is
            made for you — select one before continuing.
          </p>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <label
              className={[
                "flex cursor-pointer flex-col gap-1 rounded-3xl border-2 bg-white px-6 py-5 transition",
                violationChoice === "NO_VIOLATION"
                  ? "border-[#34B1AA] shadow-sm"
                  : "border-slate-200 hover:border-[#34B1AA]/40",
              ].join(" ")}
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="violationRecord"
                  value="NO_VIOLATION"
                  checked={violationChoice === "NO_VIOLATION"}
                  onChange={() => setViolationChoice("NO_VIOLATION")}
                  className="h-5 w-5 border-slate-300 text-[#34B1AA] focus:ring-[#34B1AA]"
                />
                <span className="text-lg font-semibold text-[#1E1E2C]">
                  No Violation
                </span>
              </div>
              <p className="pl-8 text-sm text-slate-600">
                Certificate will state that the student is of good moral
                character with no derogatory records.
              </p>
            </label>

            <label
              className={[
                "flex cursor-pointer flex-col gap-1 rounded-3xl border-2 bg-white px-6 py-5 transition",
                violationChoice === "HAS_VIOLATION"
                  ? "border-[#E0B50F] shadow-sm"
                  : "border-slate-200 hover:border-[#E0B50F]/40",
              ].join(" ")}
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="violationRecord"
                  value="HAS_VIOLATION"
                  checked={violationChoice === "HAS_VIOLATION"}
                  onChange={() => setViolationChoice("HAS_VIOLATION")}
                  className="h-5 w-5 border-slate-300 text-[#E0B50F] focus:ring-[#E0B50F]"
                />
                <span className="text-lg font-semibold text-[#1E1E2C]">
                  Has Violation
                </span>
              </div>
              <p className="pl-8 text-sm text-slate-600">
                Certificate will state that the student has a derogatory record
                and/or has been subjected to disciplinary action.
              </p>
            </label>
          </div>
        </div>

        {renderRejectPanel()}

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-6">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => {
              setIsRejecting((current) => !current);
              setFormError(null);
              setFieldErrors({});
            }}
            className="inline-flex rounded-2xl border-2 border-[#E05252] bg-white px-6 py-3 text-base font-semibold text-[#9B2C2C] transition hover:bg-[#E05252]/10 disabled:cursor-not-allowed disabled:opacity-70"
          >
            Reject Request
          </button>

          <button
            type="button"
            disabled={isSubmitting || !violationChoice}
            onClick={handleConfirm}
            className="inline-flex rounded-2xl bg-[#34B1AA] px-8 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-[#278b85] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "Confirming..." : "Confirm & Continue"}
          </button>
        </div>
      </div>
    );
  };

  const renderStep2 = () => {
    if (!draft) {
      return null;
    }

    return (
      <div className="px-6 py-6 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">
              Certificate No. {certificate?.certificateNumber}
            </p>
            <p className="mt-1 text-base text-slate-600">
              Issued on{" "}
              {certificate ? formatBusinessDateTime(certificate.dateOfIssuance) : ""}
            </p>
          </div>
          <span className="inline-flex rounded-full border border-[#3B8FF3]/40 bg-[#3B8FF3]/15 px-4 py-1.5 text-sm font-semibold text-[#1E589B]">
            {formatRequestStatusLabel(draft.request.status)}
          </span>
        </div>

        {formError ? (
          <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {formError}
          </div>
        ) : null}

        <div className="mt-5 overflow-hidden rounded-[1.75rem] border border-slate-200 bg-slate-100">
          <iframe
            title={`Certificate preview ${certificate?.certificateNumber ?? ""}`}
            srcDoc={certificate?.previewHtml ?? ""}
            className="min-h-[44rem] w-full bg-white"
          />
        </div>

        <div className="border-t border-slate-200 py-6">
          <p className="text-sm leading-6 text-slate-600">
            Review the generated certificate above. Use Edit if any information
            needs to change, then Release to move to the final step.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 border-t border-slate-200 pt-6">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleEdit}
            className="inline-flex rounded-2xl border border-slate-300 bg-white px-6 py-3 text-base font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70"
          >
            Edit
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => {
              setIsShowingReleaseConfirm(true);
              setFormError(null);
            }}
            className="inline-flex rounded-2xl bg-emerald-600 px-8 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            Release
          </button>
        </div>

        {renderReleaseConfirm()}
      </div>
    );
  };

  const renderStep3 = () => {
    if (!draft) {
      return null;
    }

    return (
      <div className="px-6 py-6 sm:px-8">
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-6 py-8 text-center">
          <p className="text-2xl font-bold tracking-tight text-emerald-900">
            Certificate released successfully.
          </p>
          <p className="mx-auto mt-3 max-w-md text-base leading-7 text-emerald-950/80">
            The certificate has been finalized and the request has been moved to
            Released. Download the PDF below to provide it to the student.
          </p>
        </div>

        <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 px-6 py-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
                Certificate Number
              </p>
              <p className="mt-2 text-base font-semibold text-slate-900">
                {certificate?.certificateNumber}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
                Request Status
              </p>
              <p className="mt-2 text-base font-semibold text-slate-900">
                {formatRequestStatusLabel(draft.request.status)}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          {certificateDownloadUrl ? (
            <a
              href={certificateDownloadUrl}
              className="inline-flex rounded-2xl bg-amber-400 px-8 py-3 text-base font-semibold text-slate-950 shadow-sm transition hover:bg-amber-300"
            >
              Download Certificate PDF
            </a>
          ) : null}
          <button
            type="button"
            onClick={() => {
              closeModal();
              router.refresh();
            }}
            className="inline-flex rounded-2xl bg-slate-950 px-8 py-3 text-base font-semibold text-white transition hover:bg-slate-800"
          >
            Close
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="inline-flex rounded-full bg-[#3B8FF3] px-5 py-1.5 text-xs font-semibold text-white transition hover:bg-[#2f76cc]"
      >
        Process
      </button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:p-8"
          role="dialog"
          aria-modal="true"
          aria-label={`Process request ${requestReferenceNumber}`}
        >
          <div className="my-auto w-full max-w-5xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5 sm:px-8">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
                  Request {requestReferenceNumber}
                </p>
                <p className="mt-1 text-lg font-semibold text-[#1E1E2C]">
                  {draft
                    ? formatPurposeLabel(draft.request.purposeOfRequest)
                    : "Processing request"}
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="inline-flex rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                aria-label="Close dialog"
              >
                {step === 1 && !isSubmitting ? "Cancel" : "Close"}
              </button>
            </div>

            {renderStepIndicator()}

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
            ) : !draft ? (
              <div className="px-6 py-16 text-center sm:px-8">
                <p className="text-base text-slate-600">No request data available.</p>
              </div>
            ) : step === 1 ? (
              renderStep1()
            ) : step === 2 ? (
              renderStep2()
            ) : (
              renderStep3()
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}