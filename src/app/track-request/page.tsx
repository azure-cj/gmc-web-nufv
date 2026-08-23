import Link from "next/link";
import { prisma } from "@/lib/prisma";
import PublicFooter from "@/components/public/public-footer";
import {
  formatBusinessDateTime,
  formatPaymentVerificationLabel,
  formatPurposeLabel,
  formatRequestStatusLabel,
} from "@/lib/gmc-request";

export const dynamic = "force-dynamic";

interface TrackRequestPageProps {
  searchParams?: Promise<{
    referenceNumber?: string | string[];
    email?: string | string[];
  }>;
}

function firstSearchParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function lookupStatusHint(status: string): string {
  switch (status) {
    case "PENDING":
      return "Your request is still under review by the Discipline Office.";
    case "APPROVED":
      return "Your request has been verified and is moving to certificate generation.";
    case "GENERATED":
      return "Your certificate has been generated and is waiting for final release.";
    case "DELIVERY_FAILED":
      return "The certificate is ready, but delivery needs another staff retry.";
    case "RETURNED":
      return "Your request was returned for correction. Please contact the Discipline Office.";
    case "REJECTED":
      return "Your request was rejected. Please contact the Discipline Office if you need clarification.";
    case "RELEASED":
      return "Your certificate is ready for pickup at the Discipline Office. Please bring a valid ID and provide your reference number and name below.";
    default:
      return "Please contact the Discipline Office for follow-up.";
  }
}

export default async function TrackRequestPage({
  searchParams,
}: TrackRequestPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const referenceNumber = firstSearchParam(resolvedSearchParams.referenceNumber).trim();
  const email = firstSearchParam(resolvedSearchParams.email).trim();
  const fieldErrors: Record<string, string> = {};

  if (resolvedSearchParams.referenceNumber !== undefined && !referenceNumber) {
    fieldErrors.referenceNumber = "Reference number is required.";
  }

  if (resolvedSearchParams.email !== undefined && !email) {
    fieldErrors.email = "Email address is required.";
  }

  if (referenceNumber && !/^GMC-\d{4}-\d{2}-\d{6}$/.test(referenceNumber)) {
    fieldErrors.referenceNumber = "Enter a valid GMC reference number.";
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    fieldErrors.email = "Enter a valid email address.";
  }

  const request =
    Object.keys(fieldErrors).length === 0 && referenceNumber && email
      ? await prisma.gmcRequest.findFirst({
          where: {
            requestReferenceNumber: referenceNumber,
            studentEmail: { equals: email, mode: "insensitive" },
          },
          include: {
            certificate: true,
          },
        })
      : null;

  return (
    <main className="min-h-screen bg-[#F9F2E7] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-screen max-w-4xl flex-col justify-between">
        <section className="w-full my-auto overflow-hidden rounded-[2rem] border border-[#2C4368]/20 bg-white shadow-xl">
          <div className="border-b border-[#2C4368]/20 bg-[linear-gradient(135deg,#102040_0%,#2C4368_100%)] px-8 py-8 text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#E0C07A]">
              Discipline Office
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Track Request Status
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-200">
              Enter your GMC reference number and the email address used in the submission to
              view the current request status.
            </p>
          </div>

          <div className="grid gap-0 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="border-b border-[#2C4368]/20 bg-[#102040] px-8 py-8 text-slate-100 lg:border-b-0 lg:border-r">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#E0C07A]">
                How it works
              </p>
              <ul className="mt-5 space-y-4 text-sm leading-7 text-slate-300">
                <li>Use the reference number issued after submission.</li>
                <li>The email must match the address on the request record.</li>
                <li>Only the current request status is shown here.</li>
              </ul>

              <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-5">
                <p className="text-sm font-semibold text-white">Need to submit a request?</p>
                <p className="mt-2 text-sm leading-7 text-slate-300">
                  Return to the request form if you have not submitted yet.
                </p>
                <Link
                  href="/"
                  className="mt-4 inline-flex rounded-2xl bg-[#E0C07A] px-5 py-3 text-sm font-bold text-[#102040] transition hover:bg-[#d8b56a] shadow-sm"
                >
                  Back to Request Form
                </Link>
              </div>
            </div>

            <div className="bg-slate-50 px-8 py-8 sm:px-10 sm:py-10">
              <form method="get" className="space-y-5">
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Reference Number</span>
                  <input
                    type="text"
                    name="referenceNumber"
                    defaultValue={referenceNumber}
                    placeholder="e.g. GMC-2026-08-000001"
                    className={[
                      "mt-2 block w-full rounded-2xl border bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400",
                      fieldErrors.referenceNumber
                        ? "border-rose-400 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15"
                        : "border-[#2C4368]/25 focus:border-[#102040] focus:ring-4 focus:ring-[#102040]/15",
                    ].join(" ")}
                  />
                  {fieldErrors.referenceNumber ? (
                    <p className="mt-2 text-sm text-rose-600">
                      {fieldErrors.referenceNumber}
                    </p>
                  ) : null}
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Email Address</span>
                  <input
                    type="email"
                    name="email"
                    defaultValue={email}
                    placeholder="e.g. student@school.edu"
                    className={[
                      "mt-2 block w-full rounded-2xl border bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400",
                      fieldErrors.email
                        ? "border-rose-400 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15"
                        : "border-[#2C4368]/25 focus:border-[#102040] focus:ring-4 focus:ring-[#102040]/15",
                    ].join(" ")}
                  />
                  <p className="mt-2 text-sm text-slate-500">
                    Use the email address you entered on the request form.
                  </p>
                  {fieldErrors.email ? (
                    <p className="mt-2 text-sm text-rose-600">{fieldErrors.email}</p>
                  ) : null}
                </label>

                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center rounded-2xl bg-[#102040] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#2C4368]"
                >
                  Check Status
                </button>
              </form>

              <div className="mt-8">
                {request ? (
                  <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-600">
                      Match found
                    </p>
                    <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
                      {request.requestReferenceNumber}
                    </h2>
                    <p className="mt-2 text-sm leading-7 text-slate-600">
                      {lookupStatusHint(request.status)}
                    </p>

                    {request.status === "RELEASED" ? (
                      <div className="mt-5 rounded-2xl border-2 border-[#102040]/15 bg-[#F0F4F8] p-5">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[#102040]" />
                          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#102040]">
                            Discipline Office Pickup Details
                          </p>
                        </div>
                        <p className="mt-1 text-xs leading-5 text-slate-600">
                          Please bring a valid ID and present or screenshot these verification details when claiming your certificate:
                        </p>
                        <div className="mt-3.5 grid gap-3 sm:grid-cols-2">
                          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
                            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                              Reference Number
                            </span>
                            <p className="mt-1 font-mono text-base font-bold text-[#102040]">
                              {request.requestReferenceNumber}
                            </p>
                          </div>
                          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
                            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                              Student Name
                            </span>
                            <p className="mt-1 text-base font-bold text-[#102040]">
                              {[
                                request.studentFirstName,
                                request.studentMiddleInitial
                                  ? `${request.studentMiddleInitial}.`
                                  : null,
                                request.studentLastName,
                              ]
                                .filter(Boolean)
                                .join(" ")}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    <div className="mt-6 grid gap-4 sm:grid-cols-2">
                      {[
                        {
                          label: "Student Name",
                          value: [
                            request.studentFirstName,
                            request.studentMiddleInitial
                              ? `${request.studentMiddleInitial}.`
                              : null,
                            request.studentLastName,
                          ]
                            .filter(Boolean)
                            .join(" "),
                        },
                        {
                          label: "Status",
                          value: formatRequestStatusLabel(request.status),
                        },
                        {
                          label: "Purpose",
                          value: formatPurposeLabel(request.purposeOfRequest),
                        },
                        {
                          label: "Payment Verification",
                          value: formatPaymentVerificationLabel(
                            request.paymentVerificationStatus,
                          ),
                        },
                        {
                          label: "Date Submitted",
                          value: formatBusinessDateTime(request.dateSubmitted),
                        },
                        {
                          label: "Date Released",
                          value: request.dateReleased
                            ? formatBusinessDateTime(request.dateReleased)
                            : "Not released yet",
                        },
                        {
                          label: "Certificate No.",
                          value: request.certificate?.certificateNumber ?? "Not issued yet",
                        },
                        {
                          label: "Course / Program",
                          value: request.studentCourseProgram,
                        },
                      ].map((item) => (
                        <div
                          key={item.label}
                          className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                        >
                          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
                            {item.label}
                          </p>
                          <p className="mt-2 text-sm font-medium text-slate-900">
                            {item.value}
                          </p>
                        </div>
                      ))}
                    </div>
                  </section>
                ) : referenceNumber && email && Object.keys(fieldErrors).length === 0 ? (
                  <section className="rounded-[1.75rem] border border-rose-200 bg-rose-50 p-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-rose-700">
                      No match found
                    </p>
                    <p className="mt-3 text-sm leading-7 text-rose-900">
                      We could not find a request matching that reference number and email
                      address. Check the details and try again, or contact the Discipline
                      Office for assistance.
                    </p>
                  </section>
                ) : (
                  <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6">
                    <p className="text-sm leading-7 text-slate-600">
                      Enter a reference number and email address to see the current request
                      status.
                    </p>
                  </section>
                )}
              </div>
            </div>
          </div>
        </section>

        <PublicFooter />
      </div>
    </main>
  );
}

