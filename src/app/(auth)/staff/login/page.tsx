import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { loadValidatedStaffSession } from "@/lib/staff-session";
import StaffLoginForm from "@/components/staff/staff-login-form";

export const dynamic = "force-dynamic";

interface StaffLoginPageProps {
  searchParams?: Promise<{
    error?: string | string[];
  }>;
}

export default async function StaffLoginPage({
  searchParams,
}: StaffLoginPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const cookieStore = await cookies();
  const existingSession = await loadValidatedStaffSession(prisma, cookieStore);

  if (existingSession) {
    redirect("/staff");
  }

  const errorMessage = Array.isArray(resolvedSearchParams.error)
    ? resolvedSearchParams.error[0]
    : resolvedSearchParams.error;

  return (
    <main className="min-h-screen bg-[#F4F6F8] px-4 py-10 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="w-full max-w-6xl">
        <section className="grid w-full gap-0 overflow-hidden rounded-[2rem] border border-[#E2E8F0] bg-white shadow-2xl lg:grid-cols-[1.2fr_0.8fr]">
          
          <div
            className="relative min-h-[560px] overflow-hidden bg-[#102040] bg-cover bg-center bg-no-repeat px-8 py-12 text-white sm:px-10 sm:py-14 lg:px-12 lg:py-16"
            style={{ backgroundImage: "url('/images/backgrounds/login-bg.png')" }}
          >
            <div className="absolute inset-0 bg-[#102040]/10" aria-hidden="true" />

            <div className="relative z-10 flex h-full min-h-[560px] flex-col">
              <div className="mt-8 max-w-md">
                <div className="flex items-center gap-3">
                  <Image
                    src="/images/brand/gmclogo.png"
                    alt="GMC logo"
                    width={80}
                    height={80}
                    className="h-20 w-20 object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.35)]"
                    priority
                  />
                  <p className="text-xs font-bold uppercase tracking-[0.45em] text-[#E0C07A]">
                    GMC WEB
                  </p>
                </div>
                <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
                  Staff Sign In
                </h1>
                <div className="mt-4 h-1 w-20 rounded-full bg-[#E0C07A]" />
              </div>

              <div className="pointer-events-none mt-auto -mb-10 -ml-10 h-48 overflow-hidden">
                <svg
                  className="h-full w-[22rem] text-white/25"
                  viewBox="0 0 400 220"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path d="M24 196H376" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M52 196V90L152 54L224 82V196" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M224 196V76L332 116V196" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M52 90L152 54L224 82L332 116" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M78 112H126M78 136H126M78 160H126" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M250 130H302M250 152H302M250 174H302" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M120 196V114M152 196V96M184 196V108M268 196V126M300 196V142" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M24 176L376 92" stroke="currentColor" strokeWidth="1.2" strokeDasharray="4 5" opacity="0.8" />
                </svg>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-center border-l border-slate-200 bg-white px-8 py-12 sm:px-12 sm:py-16 lg:px-16">
            <StaffLoginForm errorMessage={errorMessage} />
          </div>
          
        </section>
      </div>
    </main>
  );
}
