import Link from "next/link";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { formatBusinessDate } from "@/lib/gmc-request";
import { isVerificationRateLimited } from "@/lib/verification-rate-limit";
import PublicFooter from "@/components/public/public-footer";

export const dynamic = "force-dynamic";

interface VerifyCertificatePageProps {
  params: Promise<{ token: string }>;
}

function extractClientIp(
  headerList: Awaited<ReturnType<typeof headers>>,
): string {
  const forwarded = headerList.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }

  return headerList.get("x-real-ip") ?? "unknown";
}

export default async function VerifyCertificatePage({
  params,
}: VerifyCertificatePageProps) {
  const { token } = await params;
  const headerList = await headers();
  const clientIp = extractClientIp(headerList);
  const rateLimited = await isVerificationRateLimited(clientIp);

  const certificate =
    !rateLimited && token
      ? await prisma.certificate.findUnique({
          where: { verificationToken: token },
        })
      : null;

  const notFound = !rateLimited && !certificate;

  return (
    <main className="min-h-screen bg-[#F9F2E7] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-screen max-w-4xl flex-col justify-between">
        <section className="w-full my-auto overflow-hidden rounded-[2rem] border border-[#2C4368]/20 bg-white shadow-xl">
          <div className="border-b border-[#2C4368]/20 bg-[linear-gradient(135deg,#102040_0%,#2C4368_100%)] px-8 py-8 text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#E0C07A]">
              Discipline Office
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Certificate Verification
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-200">
              Scan or offer the QR code printed on a Good Moral Character
              certificate to confirm its validity.
            </p>
          </div>

          <div className="px-8 py-8 sm:px-10 sm:py-12">
            {rateLimited ? (
              <section className="rounded-[1.75rem] border border-amber-200 bg-amber-50 p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-700">
                  Too many attempts
                </p>
                <p className="mt-3 text-sm leading-7 text-amber-900">
                  Too many requests, please try again later. If the problem
                  persists, please contact the Discipline Office directly.
                </p>
              </section>
            ) : notFound ? (
              <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                  Verification record not found
                </p>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  We could not verify a certificate for the code provided.
                  Please check the QR code and try again, or contact the
                  Discipline Office for assistance.
                </p>
                <Link
                  href="/track-request"
                  className="mt-5 inline-flex rounded-2xl bg-[#102040] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#2C4368]"
                >
                  Track Request Status
                </Link>
              </section>
            ) : certificate?.status === "VOIDED" ? (
              <section className="rounded-[1.75rem] border border-rose-200 bg-rose-50 p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-rose-700">
                  Certificate no longer valid
                </p>
                <p className="mt-3 text-sm leading-7 text-rose-900">
                  This certificate has been voided by the Discipline Office and
                  should not be accepted. Please contact the Discipline Office
                  if you have questions.
                </p>
              </section>
            ) : certificate ? (
              <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  <p className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-600">
                    This certificate is valid
                  </p>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {[
                    {
                      label: "Certificate No.",
                      value: certificate.certificateNumber,
                    },
                    {
                      label: "Student Name",
                      value: certificate.studentFullName,
                    },
                    {
                      label: "Course / Program",
                      value: certificate.courseProgram,
                    },
                    {
                      label: "Date of Issuance",
                      value: formatBusinessDate(certificate.dateOfIssuance),
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

                <p className="mt-6 text-sm leading-7 text-slate-600">
                  This certificate was issued by the National University
                  Fairview Discipline Office. For further verification, contact
                  the Discipline Office directly.
                </p>
              </section>
            ) : null}

            <div className="mt-8 text-center">
              <Link
                href="/track-request"
                className="text-sm font-semibold text-[#102040] underline-offset-4 hover:underline"
              >
                Track a request status instead
              </Link>
            </div>
          </div>
        </section>

        <PublicFooter />
      </div>
    </main>
  );
}