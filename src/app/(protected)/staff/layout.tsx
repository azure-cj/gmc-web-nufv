import type { ReactNode } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { loadValidatedStaffSession } from "@/lib/staff-session";
import StaffNavbar from "@/components/staff/staff-navbar";
import StaffSidebar from "@/components/staff/staff-sidebar";
import StaffSessionHeartbeat from "@/components/staff/staff-session-heartbeat";

export const dynamic = "force-dynamic";

export default async function StaffLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const cookieStore = await cookies();
  const validatedSession = await loadValidatedStaffSession(prisma, cookieStore);

  if (!validatedSession) {
    redirect("/staff/login");
  }

  const headerList = await headers();
  const pathname = headerList.get("x-pathname") || "";

  // Mandatory first-time password change check
  const mustChangePassword = validatedSession.staffUser.mustChangePassword;
  const isChangePasswordRoute = pathname === "/staff/change-password";

  if (mustChangePassword && !isChangePasswordRoute) {
    redirect("/staff/change-password");
  }

  if (!mustChangePassword && isChangePasswordRoute) {
    redirect("/staff");
  }

  const staffUserData = {
    name: validatedSession.staffUser.name,
    email: validatedSession.staffUser.email,
    role: validatedSession.staffUser.role,
  };

  // If password change is required, render locked layout without sidebar navigation
  if (mustChangePassword) {
    return (
      <div className="min-h-screen bg-[#1E1E2C] text-slate-100 flex flex-col">
        <StaffSessionHeartbeat />
        <StaffNavbar staffUser={staffUserData} />
        <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8 flex items-center justify-center">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F6F8] text-slate-900 flex flex-col">
      {/* Keep the session alive with the same validation path used by API routes. */}
      <StaffSessionHeartbeat />
      {/* Sticky Full-Width Dark Top Navbar */}
      <StaffNavbar staffUser={staffUserData} />

      {/* Main Container with Sidebar + Main Content */}
      <div className="flex flex-1 min-w-0">
        <StaffSidebar staffUser={staffUserData} />

        <div className="flex min-w-0 flex-1 flex-col">
          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
