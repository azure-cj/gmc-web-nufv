import { redirect } from "next/navigation";
import { cookies } from "next/headers";
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
    <main className="min-h-screen bg-[#F4F6F8] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-screen max-w-4xl items-center justify-center">
        <section className="grid w-full gap-0 overflow-hidden rounded-[2rem] border border-[#E2E8F0] bg-white shadow-xl lg:grid-cols-[1.15fr_0.85fr]">
          <div className="bg-[#1E1E2C] px-8 py-10 text-white sm:px-10 sm:py-12">
            <p className="text-xs font-bold uppercase tracking-[0.4em] text-[#F29F67]">
              GMC Web
            </p>
            <h1 className="mt-4 max-w-md text-3xl font-semibold tracking-tight text-white">
              Staff Sign In
            </h1>
            <p className="mt-4 max-w-lg text-sm leading-7 text-slate-300">
              Sign in with your staff email and password to review, verify, and manage
              incoming Good Moral Certificate requests.
            </p>

            <div className="mt-10 space-y-4 rounded-3xl border border-[#2D2D3F] bg-white/5 p-6">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-[#94A3B8]">
                  Session policy
                </p>
                <ul className="mt-4 space-y-3 text-sm text-slate-200">
                  <li>Session cookies are httpOnly and signed per login.</li>
                  <li>Active sessions renew while staff is using the app.</li>
                  <li>Failed logins are rate-limited per email and IP.</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 px-8 py-10 sm:px-10 sm:py-12">
            <StaffLoginForm errorMessage={errorMessage} />
          </div>
        </section>
      </div>
    </main>
  );
}
