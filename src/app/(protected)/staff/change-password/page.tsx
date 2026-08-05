import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { loadValidatedStaffSession } from "@/lib/staff-session";
import StaffChangePasswordClient from "@/components/staff/staff-change-password-client";

export const dynamic = "force-dynamic";

export default async function StaffChangePasswordPage() {
  const cookieStore = await cookies();
  const validatedSession = await loadValidatedStaffSession(prisma, cookieStore);

  if (!validatedSession) {
    redirect("/staff/login");
  }

  // If password was already changed, redirect back to dashboard
  if (!validatedSession.staffUser.mustChangePassword) {
    redirect("/staff");
  }

  const staffUserData = {
    name: validatedSession.staffUser.name,
    email: validatedSession.staffUser.email,
    role: validatedSession.staffUser.role,
  };

  return <StaffChangePasswordClient staffUser={staffUserData} />;
}
