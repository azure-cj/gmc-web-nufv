import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { loadValidatedStaffSession } from "@/lib/staff-session";
import StaffUsersWorkspace, {
  type StaffUserItem,
} from "@/components/staff/staff-users-workspace";
import { StaffRole } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function StaffUsersPage() {
  const cookieStore = await cookies();
  const validatedSession = await loadValidatedStaffSession(prisma, cookieStore);

  if (!validatedSession) {
    redirect("/staff/login");
  }

  // Server-side Admin check: Non-admins trying to access this route are blocked and redirected
  if (validatedSession.staffUser.role !== StaffRole.ADMIN) {
    redirect("/staff");
  }

  const staffUsers = await prisma.staffUser.findMany({
    orderBy: { name: "asc" },
    include: {
      sessions: {
        orderBy: { lastUsedAt: "desc" },
        take: 1,
      },
    },
  });

  const formattedUsers: StaffUserItem[] = staffUsers.map((u) => {
    const lastSession = u.sessions[0];
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role as "ADMIN" | "DISCIPLINE_OFFICE_STAFF",
      isActive: u.isActive,
      mustChangePassword: u.mustChangePassword,
      lastLoginAt: lastSession ? lastSession.lastUsedAt.toISOString() : null,
    };
  });

  return (
    <StaffUsersWorkspace
      currentAdminId={validatedSession.staffUser.id}
      initialUsers={formattedUsers}
    />
  );
}
