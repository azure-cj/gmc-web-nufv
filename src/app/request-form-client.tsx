"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import {
  GMC_REQUEST_COURSE_PROGRAM_OPTIONS,
  GMC_REQUEST_PAYMENT_PROOF_ALLOWED_EXTENSIONS,
  GMC_REQUEST_PAYMENT_PROOF_ALLOWED_MIME_TYPES,
  GMC_REQUEST_PAYMENT_RECEIPT_MAX_LENGTH,
  GMC_REQUEST_PURPOSE_OPTIONS,
  GMC_REQUEST_TITLE_PREFIX_OPTIONS,
  INVOICE_NUMBER_PATTERN,
  type GmcRequestFieldErrors,
  validateGmcRequestSubmission,
} from "@/lib/gmc-request";

interface RequestFormClientProps {
  feeAmountPhp?: number;
  defaultAcademicYear?: string;
  defaultTerm?: string;
}

interface RequestFormState {
  studentId: string;
  titlePrefix: string;
  firstName: string;
  middleInitial: string;
  lastName: string;
  courseProgram: string;
  academicYear: string;
  term: string;
  purposeOfRequest: string;
  email: string;
  paymentReceiptNumber: string;
  paymentProofFile: File | null;
  accuracyCertified: boolean;
}

interface SubmissionResult {
  requestReferenceNumber: string;
  studentName: string;
  studentEmail: string;
  submittedAt: string;
  acknowledgmentEmailSent: boolean;
}

function buildInitialFormState(
  defaultAcademicYear: string,
  defaultTerm: string,
): RequestFormState {
  return {
    studentId: "",
    titlePrefix: "",
    firstName: "",
    middleInitial: "",
    lastName: "",
    courseProgram: "",
    academicYear: defaultAcademicYear,
    term: defaultTerm,
    purposeOfRequest: "",
    email: "",
    paymentReceiptNumber: "",
    paymentProofFile: null,
    accuracyCertified: false,
  };
}

const PAYMENT_PROOF_ACCEPT = [
  ...GMC_REQUEST_PAYMENT_PROOF_ALLOWED_MIME_TYPES,
  ...GMC_REQUEST_PAYMENT_PROOF_ALLOWED_EXTENSIONS,
].join(",");

const inputBaseClass =
  "mt-2 w-full rounded-2xl border border-[#2C4368]/25 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[#102040] focus:ring-4 focus:ring-[#102040]/15";
const errorInputClass = "border-rose-500 focus:border-rose-500 focus:ring-rose-500/15";

function fieldClassName(hasError: boolean): string {
  return `${inputBaseClass} ${hasError ? errorInputClass : ""}`;
}

function toTitleCase(text: string): string {
  if (!text) return "";
  return text.replace(/\b\w+/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}

function formDataFromValues(values: RequestFormState): FormData {
  const formData = new FormData();

  formData.set("studentId", values.studentId);
  formData.set("titlePrefix", values.titlePrefix);
  formData.set("firstName", values.firstName);
  formData.set("middleInitial", values.middleInitial);
  formData.set("lastName", values.lastName);
  formData.set("courseProgram", values.courseProgram);
  formData.set("academicYear", values.academicYear);
  formData.set("term", values.term);
  formData.set("purposeOfRequest", values.purposeOfRequest);
  formData.set("email", values.email);
  formData.set("paymentReceiptNumber", values.paymentReceiptNumber);
  formData.set("accuracyCertified", String(values.accuracyCertified));

  if (values.paymentProofFile) {
    formData.set("paymentProofFile", values.paymentProofFile);
  }

  return formData;
}

function formatSubmittedDate(submittedAt: string): string {
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(submittedAt));
}

export default function RequestFormClient({
  feeAmountPhp,
  defaultAcademicYear = "2026-2027",
  defaultTerm = "Term 1",
}: RequestFormClientProps) {
  const [values, setValues] = useState<RequestFormState>(
    buildInitialFormState(defaultAcademicYear, defaultTerm),
  );
  const [errors, setErrors] = useState<GmcRequestFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submission, setSubmission] = useState<SubmissionResult | null>(null);
  const [bannerImageFailed, setBannerImageFailed] = useState(false);
  const [duplicateInvoiceError, setDuplicateInvoiceError] = useState<string | null>(
    null,
  );
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const updateField = <K extends keyof RequestFormState>(
    key: K,
    value: RequestFormState[K],
  ) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!current[key]) {
        return current;
      }

      const next: GmcRequestFieldErrors = { ...current };
      delete next[key as keyof GmcRequestFieldErrors];
      return next;
    });
    setFormError(null);
    if (key === "paymentReceiptNumber") {
      setDuplicateInvoiceError(null);
    }
  };

  const checkInvoiceDuplicate = async (invoiceNumber: string): Promise<boolean> => {
    const trimmed = invoiceNumber.trim();

    if (!trimmed || !INVOICE_NUMBER_PATTERN.test(trimmed)) {
      setDuplicateInvoiceError(null);
      return false;
    }

    try {
      const response = await fetch(
        `/api/gmc-requests/check-invoice?invoiceNumber=${encodeURIComponent(trimmed)}`,
      );
      const payload = (await response.json().catch(() => null)) as {
        exists?: boolean;
      } | null;

      if (payload?.exists) {
        setDuplicateInvoiceError(
          "This invoice number has already been used for a request. If you believe this is an error, please contact the Discipline Office.",
        );
        return true;
      }

      setDuplicateInvoiceError(null);
      return false;
    } catch {
      setDuplicateInvoiceError(null);
      return false;
    }
  };

  const clearFormState = () => {
    setValues(buildInitialFormState(defaultAcademicYear, defaultTerm));
    setErrors({});
    setFormError(null);
    setDuplicateInvoiceError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const resetForm = () => {
    clearFormState();
    setSubmission(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const validation = await validateGmcRequestSubmission(values);
    if (!validation.values) {
      setErrors(validation.fieldErrors);
      return;
    }

    const isDuplicate = await checkInvoiceDuplicate(
      validation.values.paymentReceiptNumber,
    );
    if (isDuplicate) {
      setFormError(
        "This invoice number has already been used for a request. If you believe this is an error, please contact the Discipline Office.",
      );
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/gmc-requests", {
        method: "POST",
        body: formDataFromValues({
          studentId: validation.values.studentId,
          titlePrefix: validation.values.titlePrefix,
          firstName: validation.values.firstName,
          middleInitial: validation.values.middleInitial ?? "",
          lastName: validation.values.lastName,
          courseProgram: validation.values.courseProgram,
          academicYear: validation.values.academicYear,
          term: validation.values.term,
          purposeOfRequest: validation.values.purposeOfRequest,
          email: validation.values.email,
          paymentReceiptNumber: validation.values.paymentReceiptNumber,
          paymentProofFile: validation.values.paymentProofFile,
          accuracyCertified: validation.values.accuracyCertified,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            fieldErrors?: GmcRequestFieldErrors;
            formError?: string;
            requestReferenceNumber?: string;
            studentName?: string;
            studentEmail?: string;
            submittedAt?: string;
            acknowledgmentEmailSent?: boolean;
          }
        | null;

      if (!response.ok) {
        if (payload?.fieldErrors) {
          setErrors(payload.fieldErrors);
        }
        setFormError(
          payload?.formError ??
            "Please correct the highlighted fields and try again.",
        );
        return;
      }

      if (!payload?.requestReferenceNumber || !payload?.submittedAt) {
        setFormError("Submission succeeded, but the confirmation data was missing.");
        return;
      }

      setSubmission({
        requestReferenceNumber: payload.requestReferenceNumber,
        studentName: payload.studentName ?? values.firstName,
        studentEmail: payload.studentEmail ?? values.email,
        submittedAt: payload.submittedAt,
        acknowledgmentEmailSent: Boolean(payload.acknowledgmentEmailSent),
      });
      clearFormState();
    } catch (error) {
      console.error("Client submission failed:", error);
      setFormError("Unable to submit your request right now. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submission) {
    return (
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white/95 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.45)] backdrop-blur">
        <div className="border-b border-slate-200 bg-gradient-to-r from-emerald-50 via-white to-amber-50 px-8 py-7">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-emerald-700">
            Submission complete
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            Good Moral Certificate Request
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Your request has been received and is now in the Discipline Office queue.
          </p>
        </div>

        <div className="px-8 py-8">
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-6 py-5 text-emerald-950">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-700">
              Reference Number
            </p>
            <p className="mt-2 text-3xl font-semibold tracking-tight">
              {submission.requestReferenceNumber}
            </p>
            <p className="mt-3 text-sm leading-6 text-emerald-900/80">
              We have recorded your submission for {submission.studentName || "the student"}.
              Save your reference number below — you can check your request status anytime using
              the{" "}
              <Link
                href={`/track-request?referenceNumber=${encodeURIComponent(submission.requestReferenceNumber)}&email=${encodeURIComponent(submission.studentEmail)}`}
                className="font-semibold text-emerald-950 underline decoration-emerald-700/60 underline-offset-2 transition hover:decoration-emerald-950"
              >
                Track Request Status
              </Link>{" "}
              page.
            </p>
            <p className="mt-2 text-sm text-emerald-900/70">
              Submitted on {formatSubmittedDate(submission.submittedAt)}.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Submit Another Request
            </button>
            <Link
              href={`/track-request?referenceNumber=${encodeURIComponent(submission.requestReferenceNumber)}&email=${encodeURIComponent(submission.studentEmail)}`}
              className="inline-flex items-center justify-center rounded-full border border-emerald-300 bg-emerald-100/80 px-5 py-3 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-200 shadow-sm"
            >
              Track Request Status
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white/95 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.45)] backdrop-blur">
      {!bannerImageFailed ? (
        <div className="overflow-hidden rounded-t-[2rem] border-b border-slate-200 bg-white leading-none">
          <div className="relative overflow-hidden rounded-t-[2rem]">
            <img
              src="/images/form/bannerform.jpg"
              alt="NU Fairview Discipline Office — Good Moral Certificate Request"
              className="block h-auto w-full"
              onError={() => setBannerImageFailed(true)}
            />

            <Link
              href="/track-request"
              className="absolute right-3 top-[68%] hidden -translate-y-1/2 items-center justify-center rounded-full bg-[#E0C07A] px-5 py-3 text-sm font-semibold text-[#102040] shadow-[0_10px_24px_rgba(16,32,64,0.25)] ring-1 ring-[#E0C07A]/70 transition duration-200 hover:-translate-y-[54%] hover:scale-[1.02] hover:shadow-[0_14px_28px_rgba(16,32,64,0.3)] sm:inline-flex"
            >
              Track Request Status
            </Link>
          </div>

          <div className="border-t border-[#E0C07A]/30 bg-white px-4 py-4 sm:hidden">
            <Link
              href="/track-request"
              className="inline-flex w-full items-center justify-center rounded-full bg-[#E0C07A] px-5 py-3 text-sm font-semibold text-[#102040] shadow-[0_10px_24px_rgba(16,32,64,0.22)] ring-1 ring-[#E0C07A]/70 transition hover:scale-[1.01] hover:shadow-[0_14px_28px_rgba(16,32,64,0.28)]"
            >
              Track Request Status
            </Link>
          </div>
        </div>
      ) : (
        <div className="border-b border-[#2C4368]/20 bg-[linear-gradient(135deg,#102040_0%,#2C4368_100%)] px-8 py-8 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#E0C07A]">
            Discipline Office
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Good Moral Certificate Request
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-100/85">
            Fill out the form below to submit your request.
          </p>
        </div>
      )}

      <form className="px-8 py-8" onSubmit={handleSubmit} noValidate>
        {formError ? (
          <div
            className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900"
            role="alert"
          >
            {formError}
          </div>
        ) : null}

        <fieldset disabled={isSubmitting} className="space-y-6">
          <fieldset className="rounded-3xl border border-[#2C4368]/20 bg-slate-50/70 px-5 py-6">
            <legend className="px-1 text-sm font-semibold uppercase tracking-[0.28em] text-[#2C4368]">
              Student Information
            </legend>

            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <div>
                <label htmlFor="studentId" className="text-sm font-medium text-slate-800">
                  Student ID Number
                </label>
                <input
                  id="studentId"
                  name="studentId"
                  type="text"
                  placeholder="e.g. 2021-123456 (year-number, up to 10 digits)"
                  autoComplete="off"
                  value={values.studentId}
                  onChange={(event) => updateField("studentId", event.target.value)}
                  className={fieldClassName(Boolean(errors.studentId))}
                  aria-invalid={Boolean(errors.studentId)}
                  aria-describedby={errors.studentId ? "studentId-error" : undefined}
                />
                {errors.studentId ? (
                  <p id="studentId-error" className="mt-2 text-sm text-rose-700">
                    {errors.studentId}
                  </p>
                ) : null}
              </div>

              <div>
                <label htmlFor="titlePrefix" className="text-sm font-medium text-slate-800">
                  Title Prefix
                </label>
                <select
                  id="titlePrefix"
                  name="titlePrefix"
                  value={values.titlePrefix}
                  onChange={(event) => updateField("titlePrefix", event.target.value)}
                  className={fieldClassName(Boolean(errors.titlePrefix))}
                  aria-invalid={Boolean(errors.titlePrefix)}
                  aria-describedby={errors.titlePrefix ? "titlePrefix-error" : undefined}
                >
                  <option value="">Select title prefix</option>
                  {GMC_REQUEST_TITLE_PREFIX_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {errors.titlePrefix ? (
                  <p id="titlePrefix-error" className="mt-2 text-sm text-rose-700">
                    {errors.titlePrefix}
                  </p>
                ) : null}
              </div>

              <div>
                <label htmlFor="firstName" className="text-sm font-medium text-slate-800">
                  First Name
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  placeholder="e.g. Juan"
                  value={values.firstName}
                  onChange={(event) => updateField("firstName", toTitleCase(event.target.value))}
                  className={fieldClassName(Boolean(errors.firstName))}
                  aria-invalid={Boolean(errors.firstName)}
                  aria-describedby={errors.firstName ? "firstName-error" : undefined}
                />
                {errors.firstName ? (
                  <p id="firstName-error" className="mt-2 text-sm text-rose-700">
                    {errors.firstName}
                  </p>
                ) : null}
              </div>

              <div>
                <label htmlFor="middleInitial" className="text-sm font-medium text-slate-800">
                  Middle Initial <span className="text-slate-500">(optional)</span>
                </label>
                <input
                  id="middleInitial"
                  name="middleInitial"
                  type="text"
                  maxLength={1}
                  placeholder="M"
                  value={values.middleInitial}
                  onChange={(event) =>
                    updateField(
                      "middleInitial",
                      toTitleCase(event.target.value.slice(0, 1)),
                    )
                  }
                  className={fieldClassName(Boolean(errors.middleInitial))}
                  aria-invalid={Boolean(errors.middleInitial)}
                  aria-describedby={errors.middleInitial ? "middleInitial-error" : undefined}
                />
                {errors.middleInitial ? (
                  <p id="middleInitial-error" className="mt-2 text-sm text-rose-700">
                    {errors.middleInitial}
                  </p>
                ) : null}
              </div>

              <div>
                <label htmlFor="lastName" className="text-sm font-medium text-slate-800">
                  Last Name
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  placeholder="e.g. Dela Cruz"
                  value={values.lastName}
                  onChange={(event) => updateField("lastName", toTitleCase(event.target.value))}
                  className={fieldClassName(Boolean(errors.lastName))}
                  aria-invalid={Boolean(errors.lastName)}
                  aria-describedby={errors.lastName ? "lastName-error" : undefined}
                />
                {errors.lastName ? (
                  <p id="lastName-error" className="mt-2 text-sm text-rose-700">
                    {errors.lastName}
                  </p>
                ) : null}
              </div>

              <div className="md:col-span-2">
                <label htmlFor="courseProgram" className="text-sm font-medium text-slate-800">
                  Course / Program
                </label>
                <select
                  id="courseProgram"
                  name="courseProgram"
                  value={values.courseProgram}
                  onChange={(event) => updateField("courseProgram", event.target.value)}
                  className={fieldClassName(Boolean(errors.courseProgram))}
                  aria-invalid={Boolean(errors.courseProgram)}
                  aria-describedby={errors.courseProgram ? "courseProgram-error" : undefined}
                >
                  <option value="" disabled>
                    Select course / program
                  </option>
                  {GMC_REQUEST_COURSE_PROGRAM_OPTIONS.map((program) => (
                    <option key={program} value={program}>
                      {program}
                    </option>
                  ))}
                </select>
                {errors.courseProgram ? (
                  <p id="courseProgram-error" className="mt-2 text-sm text-rose-700">
                    {errors.courseProgram}
                  </p>
                ) : null}
              </div>
            </div>
          </fieldset>

          <fieldset className="rounded-3xl border border-[#2C4368]/20 bg-slate-50/70 px-5 py-6">
            <legend className="px-1 text-sm font-semibold uppercase tracking-[0.28em] text-[#2C4368]">
              Request Details
            </legend>

            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <div>
                <label htmlFor="academicYear" className="text-sm font-medium text-slate-800">
                  Academic Year
                </label>
                <input
                  id="academicYear"
                  name="academicYear"
                  type="text"
                  value={values.academicYear}
                  readOnly
                  disabled
                  tabIndex={-1}
                  aria-readonly="true"
                  className={`${fieldClassName(false)} cursor-not-allowed bg-slate-100 text-slate-500`}
                />
                {errors.academicYear ? (
                  <p id="academicYear-error" className="mt-2 text-sm text-rose-700">
                    {errors.academicYear}
                  </p>
                ) : null}
              </div>

              <div>
                <label htmlFor="term" className="text-sm font-medium text-slate-800">
                  Term
                </label>
                <input
                  id="term"
                  name="term"
                  type="text"
                  value={values.term}
                  readOnly
                  disabled
                  tabIndex={-1}
                  aria-readonly="true"
                  className={`${fieldClassName(false)} cursor-not-allowed bg-slate-100 text-slate-500`}
                />
                {errors.term ? (
                  <p id="term-error" className="mt-2 text-sm text-rose-700">
                    {errors.term}
                  </p>
                ) : null}
              </div>

              <div>
                <label
                  htmlFor="purposeOfRequest"
                  className="text-sm font-medium text-slate-800"
                >
                  Purpose of Request
                </label>
                <select
                  id="purposeOfRequest"
                  name="purposeOfRequest"
                  value={values.purposeOfRequest}
                  onChange={(event) => updateField("purposeOfRequest", event.target.value)}
                  className={fieldClassName(Boolean(errors.purposeOfRequest))}
                  aria-invalid={Boolean(errors.purposeOfRequest)}
                  aria-describedby={errors.purposeOfRequest ? "purposeOfRequest-error" : undefined}
                >
                  <option value="" disabled>
                    Select purpose
                  </option>
                  {GMC_REQUEST_PURPOSE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {errors.purposeOfRequest ? (
                  <p id="purposeOfRequest-error" className="mt-2 text-sm text-rose-700">
                    {errors.purposeOfRequest}
                  </p>
                ) : null}
              </div>

              <div className="md:col-span-2">
                <label htmlFor="email" className="text-sm font-medium text-slate-800">
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={values.email}
                  onChange={(event) => updateField("email", event.target.value)}
                  className={fieldClassName(Boolean(errors.email))}
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? "email-error" : "email-help"}
                />
                <p id="email-help" className="mt-2 text-sm text-slate-600">
                  Enter your email address. This will be used alongside your reference number to verify your identity when checking your status.
                </p>
                {errors.email ? (
                  <p id="email-error" className="mt-2 text-sm text-rose-700">
                    {errors.email}
                  </p>
                ) : null}
              </div>

              <div className="md:col-span-2 rounded-3xl border border-dashed border-[#2C4368]/30 bg-white px-5 py-5">
                <div>
                  <label
                    htmlFor="paymentReceiptNumber"
                    className="text-sm font-medium text-slate-800"
                  >
                    Invoice / Receipt Number
                  </label>
                </div>

                <input
                  id="paymentReceiptNumber"
                  name="paymentReceiptNumber"
                  type="text"
                  maxLength={GMC_REQUEST_PAYMENT_RECEIPT_MAX_LENGTH}
                  autoComplete="off"
                  value={values.paymentReceiptNumber}
                  onChange={(event) =>
                    updateField("paymentReceiptNumber", event.target.value)
                  }
                  onBlur={(event) => {
                    if (INVOICE_NUMBER_PATTERN.test(event.target.value.trim())) {
                      void checkInvoiceDuplicate(event.target.value);
                    }
                  }}
                  placeholder="e.g. INV01-12345678901"
                  className={fieldClassName(
                    Boolean(errors.paymentReceiptNumber) || Boolean(duplicateInvoiceError),
                  )}
                  aria-invalid={
                    Boolean(errors.paymentReceiptNumber) || Boolean(duplicateInvoiceError)
                  }
                  aria-describedby={
                    errors.paymentReceiptNumber || duplicateInvoiceError
                      ? "paymentReceiptNumber-error"
                      : "paymentReceiptNumber-help"
                  }
                />
                <p id="paymentReceiptNumber-help" className="mt-2 text-xs leading-5 text-slate-600">
                  Enter the invoice or receipt number exactly as printed on your payment receipt.
                </p>
                {errors.paymentReceiptNumber ? (
                  <p id="paymentReceiptNumber-error" className="mt-2 text-sm text-rose-700">
                    {errors.paymentReceiptNumber}
                  </p>
                ) : duplicateInvoiceError ? (
                  <p id="paymentReceiptNumber-error" className="mt-2 text-sm font-medium text-rose-700">
                    {duplicateInvoiceError}
                  </p>
                ) : null}
              </div>

              <div className="md:col-span-2 rounded-3xl border border-dashed border-[#2C4368]/30 bg-white px-5 py-5">
                <div>
                  <label
                    htmlFor="paymentProofFile"
                    className="text-sm font-medium text-slate-800"
                  >
                    Payment Proof Upload
                  </label>
                  <p className="mt-1 text-xs text-slate-500">
                    Please upload a clear photo of your receipt. Accepted format: JPG only, max 5MB.
                  </p>
                </div>

                <input
                  id="paymentProofFile"
                  name="paymentProofFile"
                  ref={fileInputRef}
                  type="file"
                  accept={PAYMENT_PROOF_ACCEPT}
                  required
                  onChange={(event) =>
                    updateField(
                      "paymentProofFile",
                      event.target.files?.[0] ?? null,
                    )
                  }
                  className="mt-4 block w-full rounded-2xl border border-[#2C4368]/25 bg-slate-50 px-4 py-3 text-sm text-slate-700 shadow-sm file:mr-4 file:rounded-full file:border-0 file:bg-[#102040] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-[#2C4368]"
                  aria-invalid={Boolean(errors.paymentProofFile)}
                  aria-describedby={
                    errors.paymentProofFile ? "paymentProofFile-error" : "paymentProofFile-help"
                  }
                />
                <p id="paymentProofFile-help" className="mt-2 text-xs leading-5 text-slate-600">
                  Please upload a clear photo of your receipt. Make sure all text, especially the amount, date, and receipt number, is fully visible and in focus. Blurry, cropped, or partial images may cause delays or rejection of your request.
                </p>
                {errors.paymentProofFile ? (
                  <p id="paymentProofFile-error" className="mt-2 text-sm text-rose-700">
                    {errors.paymentProofFile}
                  </p>
                ) : null}
              </div>
            </div>
          </fieldset>

          {/* Accuracy Certification Checkbox */}
          <div className="rounded-2xl border border-[#2C4368]/20 bg-slate-50 p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                required
                checked={values.accuracyCertified}
                onChange={(event) =>
                  updateField("accuracyCertified", event.target.checked)
                }
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-[#102040] focus:ring-[#102040]"
              />
              <span className="text-xs leading-5 text-slate-700">
                I certify that all information provided above is true and accurate. I understand this information will be used to generate my official Good Moral Certificate, and that submitting false information may result in rejection of this request or disciplinary action.
              </span>
            </label>
            {errors.accuracyCertified ? (
              <p className="mt-2 text-xs font-medium text-rose-700">
                {errors.accuracyCertified}
              </p>
            ) : null}
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || !values.accuracyCertified}
              className="inline-flex w-full items-center justify-center rounded-full bg-[#102040] px-6 py-4 text-base font-semibold text-white shadow-lg shadow-[#102040]/20 transition hover:bg-[#2C4368] disabled:cursor-not-allowed disabled:bg-slate-400 sm:w-auto"
            >
              {isSubmitting ? "Submitting..." : "Submit Request"}
            </button>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              Your request will be reviewed by the Discipline Office. Use your reference number to track your status at{" "}
              <Link
                href="/track-request"
                className="font-semibold text-[#102040] underline decoration-[#102040]/40 underline-offset-2 transition hover:decoration-[#102040]"
              >
                /track-request
              </Link>
              .
            </p>
          </div>
        </fieldset>
      </form>
    </section>
  );
}
