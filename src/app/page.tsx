import Link from "next/link";
import RequestFormClient from "./request-form-client";
import { getGmcRequestFeePhp } from "@/lib/gmc-request";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const feeAmountPhp = getGmcRequestFeePhp();

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#F9F2E7] px-4 py-10 sm:px-6 lg:px-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[#F9F2E7]"
      />

      <div className="relative mx-auto flex min-h-screen max-w-5xl items-center">
        <div className="w-full">
          <div className="mb-4 flex justify-end">
            <Link
              href="/track-request"
              className="inline-flex rounded-full border border-[#102040] bg-[#2C4368] px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-[#102040]"
            >
              Track Request Status
            </Link>
          </div>
          <RequestFormClient feeAmountPhp={feeAmountPhp} />
        </div>
      </div>
    </main>
  );
}
