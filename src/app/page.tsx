import RequestFormClient from "./request-form-client";
import PublicFooter from "@/components/public/public-footer";
import { getGmcRequestFeePhp } from "@/lib/gmc-request";
import { getCurrentAcademicYear, getCurrentTerm } from "@/lib/system-settings";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const feeAmountPhp = getGmcRequestFeePhp();
  const [defaultAcademicYear, defaultTerm] = await Promise.all([
    getCurrentAcademicYear(),
    getCurrentTerm(),
  ]);

  return (
    <main
      className="relative min-h-screen overflow-hidden bg-[#F9F2E7] bg-cover bg-center bg-no-repeat bg-fixed px-4 py-10 sm:px-6 lg:px-8"
      style={{ backgroundImage: "url('/images/form/gmcwebformbg.png')" }}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0" />

      <div className="relative mx-auto flex min-h-screen max-w-5xl flex-col justify-between">
        <div className="w-full my-auto">
          <RequestFormClient
            feeAmountPhp={feeAmountPhp}
            defaultAcademicYear={defaultAcademicYear}
            defaultTerm={defaultTerm}
          />
        </div>
        <PublicFooter />
      </div>
    </main>
  );
}
