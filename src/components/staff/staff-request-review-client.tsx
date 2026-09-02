"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatPaymentVerificationLabel } from "@/lib/gmc-request";

type ReviewAction = "APPROVE" | "RETURN" | "REJECT";
type PaymentVerificationChoice = "VALID" | "INVALID";

interface StaffRequestReviewClientProps {
  requestId: string;
  requestReferenceNumber: string;
  returnTo: string;
  initialAction?: ReviewAction;
  initialPaymentVerificationStatus?: PaymentVerificationChoice;
  initialOfficialReceiptNumber?: string;
}

interface ReviewResponseError {
  fieldErrors?: {
    action?: string;
    paymentVerificationStatus?: string;
    officialReceiptNumber?: string;
    note?: string;
  };
  formError?: string;
}

const ACTION_BUTTON_STYLES: Record<
  ReviewAction,
  { base: string; active: string }
> = {
  APPROVE: {
    base: "border-[#34B1AA]/40 bg-[#34B1AA]/15 text-[#1E746F] hover:bg-[#34B1AA]/25",
    active: "ring-2 ring-[#34B1AA]",
  },
  RETURN: {
    base: "border-[#E05252]/40 bg-[#E05252]/15 text-[#9B2C2C] hover:bg-[#E05252]/25",
    active: "ring-2 ring-[#E05252]",
  },
  REJECT: {
    base: "border-[#E05252]/40 bg-[#E05252]/15 text-[#9B2C2C] hover:bg-[#E05252]/25",
    active: "ring-2 ring-[#E05252]",
  },
};

function notePlaceholder(action: ReviewAction): string {
  switch (action) {
    case "RETURN":
      return "Describe what is missing or needs to be corrected.";
    case "REJECT":
      return "State the rejection reason.";
    case "APPROVE":
    default:
      return "Optional review note for the file.";
  }
}

function noteLabel(action: ReviewAction): string {
  switch (action) {
    case "RETURN":
      return "Return note";
    case "REJECT":
      return "Rejection reason";
    case "APPROVE":
    default:
      return "Review note";
  }
}

function actionHelperText(action: ReviewAction): string {
  switch (action) {
    case "RETURN":
      return "Use this when the request can be fixed and resubmitted.";
    case "REJECT":
      return "Use this for requests that cannot be approved.";
    case "APPROVE":
    default:
      return "Approving unlocks certificate generation in the next phase.";
  }
}

function actionLabel(action: ReviewAction): string {
  switch (action) {
    case "APPROVE":
      return "Approve";
    case "RETURN":
      return "Return";
    case "REJECT":
      return "Reject";
  }
}

export default function StaffRequestReviewClient({
  requestId,
  requestReferenceNumber,
  returnTo,
  initialAction = "APPROVE",
  initialPaymentVerificationStatus = "VALID",
  initialOfficialReceiptNumber = "",
}: StaffRequestReviewClientProps) {
  const router = useRouter();
  const [selectedAction, setSelectedAction] = useState<ReviewAction>(initialAction);
  const [paymentVerificationStatus, setPaymentVerificationStatus] =
    useState<PaymentVerificationChoice>(initialPaymentVerificationStatus);
  const [officialReceiptNumber, setOfficialReceiptNumber] = useState(
    initialOfficialReceiptNumber,
  );
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<ReviewResponseError["fieldErrors"]>(
    {},
  );

  async function submitAction(action: ReviewAction) {
    setSelectedAction(action);
    setIsSubmitting(true);
    setFormError(null);
    setFieldErrors({});

    try {
      const response = await fetch(`/api/staff/gmc-requests/${requestId}/review`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
          paymentVerificationStatus,
          officialReceiptNumber,
          note,
        }),
      });

      const payload = (await response.json().catch(() => null)) as ReviewResponseError | null;

      if (!response.ok) {
        if (response.status === 401) {
          router.push("/staff/login");
          return;
        }

        setFormError(payload?.formError ?? "Unable to submit the review.");
        setFieldErrors(payload?.fieldErrors ?? {});
        return;
      }

      router.push(returnTo || "/staff/gmc-requests");
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Unable to submit the review right now.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-[2rem] border border-[#E2E8F0] bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.35em] text-[#F29F67]">
            Review Action
          </p>
          <h3 className="mt-3 text-2xl font-semibold tracking-tight text-[#1E1E2C]">
            Review {requestReferenceNumber}
          </h3>
          <p className="mt-2 text-sm text-slate-600">
            Mark the payment as valid or invalid, then choose approve, return, or reject.
          </p>
        </div>

        <p className="text-sm text-slate-500">
          Current payment mark: {formatPaymentVerificationLabel(paymentVerificationStatus)}
        </p>
      </div>

      {formError ? (
        <div className="mt-6 rounded-2xl border border-[#E05252]/40 bg-[#E05252]/10 px-4 py-3 text-sm text-[#9B2C2C]">
          {formError}
        </div>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-3xl border border-[#E2E8F0] bg-slate-50 p-5">
          <span className="text-sm font-medium text-slate-700">
            Payment verification status
          </span>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {(["VALID", "INVALID"] as const).map((value) => (
              <label
                key={value}
                className={[
                  "flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium transition",
                  paymentVerificationStatus === value
                    ? "border-[#3B8FF3] bg-[#3B8FF3]/10 text-[#1E1E2C]"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100",
                ].join(" ")}
              >
                <input
                  type="radio"
                  name="paymentVerificationStatus"
                  value={value}
                  checked={paymentVerificationStatus === value}
                  onChange={() => setPaymentVerificationStatus(value)}
                  className="h-4 w-4 border-slate-300 text-[#3B8FF3] focus:ring-[#3B8FF3]"
                />
                {formatPaymentVerificationLabel(value)}
              </label>
            ))}
          </div>
          {fieldErrors?.paymentVerificationStatus ? (
            <p className="mt-3 text-sm text-[#E05252]">
              {fieldErrors.paymentVerificationStatus}
            </p>
          ) : (
            <p className="mt-3 text-sm text-slate-500">
              Approvals require the payment to be marked valid.
            </p>
          )}

          <label className="mt-5 block">
            <span className="text-sm font-medium text-slate-700">
              Official receipt number
            </span>
            <input
              type="text"
              value={officialReceiptNumber}
              onChange={(event) => setOfficialReceiptNumber(event.target.value)}
              placeholder="e.g. INV01-000044218"
              className={[
                "mt-2 block w-full rounded-2xl border bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400",
                fieldErrors?.officialReceiptNumber
                  ? "border-[#E05252] focus:border-[#E05252] focus:ring-4 focus:ring-[#E05252]/15"
                  : "border-slate-300 focus:border-[#3B8FF3] focus:ring-4 focus:ring-[#3B8FF3]/15",
              ].join(" ")}
            />
            {fieldErrors?.officialReceiptNumber ? (
              <p className="mt-2 text-sm text-[#E05252]">
                {fieldErrors.officialReceiptNumber}
              </p>
            ) : (
              <p className="mt-2 text-sm text-slate-500">
                Confirm the student-entered invoice / receipt number. Correct it if it does
                not match the payment record.
              </p>
            )}
          </label>
        </div>

        <div className="rounded-3xl border border-[#E2E8F0] bg-white p-5">
          <div className="flex flex-wrap gap-3">
            {(["APPROVE", "RETURN", "REJECT"] as const).map((action) => (
              <button
                key={action}
                type="button"
                disabled={isSubmitting}
                onClick={() => submitAction(action)}
                className={[
                  "rounded-2xl border px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-70",
                  ACTION_BUTTON_STYLES[action].base,
                  selectedAction === action ? ACTION_BUTTON_STYLES[action].active : "",
                ].join(" ")}
              >
                {action === "APPROVE" ? "Approve" : action === "RETURN" ? "Return" : "Reject"}
              </button>
            ))}
          </div>

          <div className="mt-5">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">
                {noteLabel(selectedAction)}
              </span>
              <textarea
                rows={6}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder={notePlaceholder(selectedAction)}
                className="mt-2 block w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#3B8FF3] focus:bg-white focus:ring-4 focus:ring-[#3B8FF3]/20"
              />
            </label>
            {fieldErrors?.note ? (
              <p className="mt-3 text-sm text-[#E05252]">{fieldErrors.note}</p>
            ) : (
              <p className="mt-3 text-sm text-slate-500">
                {actionHelperText(selectedAction)}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-[#E2E8F0] bg-slate-50 p-5">
        <p className="text-sm text-slate-600">
          Confirm the student-entered invoice / receipt number and review the payment
          verification status before committing the review.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => submitAction(selectedAction)}
            className="inline-flex rounded-2xl bg-[#F29F67] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#e08e56] shadow-sm disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Submitting..." : `Submit ${actionLabel(selectedAction)}`}
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => router.push(returnTo || "/staff/gmc-requests")}
            className="inline-flex rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70"
          >
            Back to Requests
          </button>
        </div>
      </div>
    </section>
  );
}
