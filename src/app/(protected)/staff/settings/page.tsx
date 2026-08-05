import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { loadValidatedStaffSession } from "@/lib/staff-session";
import StaffSettingsForm from "@/components/staff/staff-settings-form";

export const dynamic = "force-dynamic";

export default async function StaffSettingsPage() {
  const cookieStore = await cookies();
  const validatedSession = await loadValidatedStaffSession(prisma, cookieStore);

  if (!validatedSession) {
    redirect("/staff/login");
  }

  const staffUserData = {
    name: validatedSession.staffUser.name,
    email: validatedSession.staffUser.email,
    role: validatedSession.staffUser.role,
  };

  return <StaffSettingsForm staffUser={staffUserData} />;
}
