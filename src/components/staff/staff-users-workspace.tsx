"use client";

import { useState } from "react";

export interface StaffUserItem {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "DISCIPLINE_OFFICE_STAFF";
  isActive: boolean;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
}

interface StaffUsersWorkspaceProps {
  currentAdminId: string;
  initialUsers: StaffUserItem[];
}

export default function StaffUsersWorkspace({
  currentAdminId,
  initialUsers,
}: StaffUsersWorkspaceProps) {
  const [users, setUsers] = useState<StaffUserItem[]>(initialUsers);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<StaffUserItem | null>(null);

  // Form states for Create
  const [createName, setCreateName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createRole, setCreateRole] = useState<"ADMIN" | "DISCIPLINE_OFFICE_STAFF">(
    "DISCIPLINE_OFFICE_STAFF",
  );

  // Status & error banners
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/staff/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createName,
          email: createEmail,
          role: createRole,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error || "Failed to create staff user.");
        setIsSubmitting(false);
        return;
      }

      const newUserItem: StaffUserItem = {
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        role: data.user.role,
        isActive: data.user.isActive,
        mustChangePassword: data.user.mustChangePassword,
        lastLoginAt: null,
      };

      setUsers([newUserItem, ...users]);
      setSuccessMessage(`Account created for ${newUserItem.name} (${newUserItem.email}). Initial password is set to gmcnufv2026.`);
      setCreateName("");
      setCreateEmail("");
      setCreateRole("DISCIPLINE_OFFICE_STAFF");
      setIsCreateOpen(false);
      setIsSubmitting(false);
    } catch (err) {
      console.error(err);
      setErrorMessage("Network error. Please try again.");
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (targetUser: StaffUserItem) => {
    if (targetUser.id === currentAdminId && targetUser.isActive) {
      alert("You cannot deactivate your own admin account.");
      return;
    }

    const nextIsActive = !targetUser.isActive;
    const actionLabel = nextIsActive ? "reactivate" : "deactivate";

    if (
      !confirm(
        `Are you sure you want to ${actionLabel} ${targetUser.name}? ${
          !nextIsActive ? "This will immediately revoke all active sessions for this user." : ""
        }`,
      )
    ) {
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`/api/staff/users/${targetUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isActive: nextIsActive,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error || `Failed to ${actionLabel} account.`);
        return;
      }

      setUsers(
        users.map((u) =>
          u.id === targetUser.id ? { ...u, isActive: nextIsActive } : u,
        ),
      );

      setSuccessMessage(
        `Account for ${targetUser.name} has been ${nextIsActive ? "reactivated" : "deactivated and all sessions revoked"}.`,
      );
    } catch (err) {
      console.error(err);
      setErrorMessage("Network error. Please try again.");
    }
  };

  const handleUpdateRole = async (targetUser: StaffUserItem, newRole: "ADMIN" | "DISCIPLINE_OFFICE_STAFF") => {
    if (targetUser.role === newRole) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`/api/staff/users/${targetUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: newRole,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error || "Failed to update role.");
        return;
      }

      setUsers(
        users.map((u) =>
          u.id === targetUser.id ? { ...u, role: newRole } : u,
        ),
      );

      setEditingUser(null);
      setSuccessMessage(`Role for ${targetUser.name} updated to ${newRole.replace(/_/g, " ")}.`);
    } catch (err) {
      console.error(err);
      setErrorMessage("Network error. Please try again.");
    }
  };

  const activeCount = users.filter((u) => u.isActive).length;
  const totalCount = users.length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-[2rem] border border-[#2D2D3F] bg-[#1E1E2C] p-6 shadow-xl sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-3 w-3 rounded-full bg-[#34B1AA] animate-pulse" />
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#34B1AA]">
                Admin Panel
              </p>
            </div>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
              Staff User Management
            </h1>
            <p className="mt-2 text-sm leading-6 text-[#94A3B8]">
              Manage staff accounts, assign roles, and handle account activations or soft deactivations.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#3B8FF3] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-[#3B8FF3]/25 transition hover:bg-[#2575dc] focus:outline-none focus:ring-2 focus:ring-[#3B8FF3] shrink-0"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>Create Staff Account</span>
          </button>
        </div>

        {/* Stats Strip */}
        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-[#2D2D3F] pt-6 sm:grid-cols-3">
          <div className="rounded-xl border border-[#2D2D3F] bg-[#242436] p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8]">
              Total Staff Accounts
            </p>
            <p className="mt-1 text-2xl font-bold text-white">{totalCount}</p>
          </div>
          <div className="rounded-xl border border-[#2D2D3F] bg-[#242436] p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8]">
              Active Accounts
            </p>
            <p className="mt-1 text-2xl font-bold text-[#34B1AA]">{activeCount}</p>
          </div>
          <div className="col-span-2 rounded-xl border border-[#2D2D3F] bg-[#242436] p-4 sm:col-span-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8]">
              Deactivated Accounts
            </p>
            <p className="mt-1 text-2xl font-bold text-[#F29F67]">
              {totalCount - activeCount}
            </p>
          </div>
        </div>
      </div>

      {/* Banners */}
      {successMessage && (
        <div
          role="status"
          className="rounded-xl border border-[#34B1AA]/40 bg-[#34B1AA]/10 p-4 text-sm font-semibold text-[#34B1AA] flex items-start gap-3"
        >
          <svg className="h-5 w-5 shrink-0 text-[#34B1AA] mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm font-medium text-rose-300 flex items-start gap-3"
        >
          <svg className="h-5 w-5 shrink-0 text-rose-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Staff Accounts Table Card */}
      <div className="overflow-hidden rounded-[2rem] border border-[#2D2D3F] bg-[#1E1E2C] shadow-xl">
        <div className="border-b border-[#2D2D3F] p-6">
          <h2 className="text-xl font-bold tracking-tight text-white">Staff Accounts</h2>
          <p className="mt-1 text-sm text-[#94A3B8]">
            Click any row to manage account roles or toggle active status.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#2D2D3F] bg-[#161622] text-[11px] font-bold uppercase tracking-wider text-[#94A3B8]">
                <th className="px-6 py-4">Staff Member</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Last Activity</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2D2D3F] text-sm">
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="gmc-table-row transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#3B8FF3]/20 font-bold text-[#3B8FF3] text-sm">
                        {user.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .substring(0, 2)
                          .toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-white">{user.name}</p>
                        <p className="text-xs text-[#94A3B8]">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={[
                        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold tracking-wider uppercase",
                        user.role === "ADMIN"
                          ? "bg-[#F29F67]/20 text-[#F29F67] border border-[#F29F67]/30"
                          : "bg-[#3B8FF3]/20 text-[#3B8FF3] border border-[#3B8FF3]/30",
                      ].join(" ")}
                    >
                      {user.role.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {user.isActive ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/30">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-500/15 px-3 py-1 text-xs font-semibold text-slate-400 border border-slate-500/30">
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                        Deactivated
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-xs text-[#94A3B8]">
                    {user.lastLoginAt
                      ? new Date(user.lastLoginAt).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })
                      : "Never logged in"}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingUser(user)}
                        className="rounded-lg border border-[#2D2D3F] bg-[#242436] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#3B8FF3]/20 hover:border-[#3B8FF3] transition"
                      >
                        Edit Role
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleActive(user)}
                        disabled={user.id === currentAdminId}
                        className={[
                          "rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:opacity-30 disabled:cursor-not-allowed",
                          user.isActive
                            ? "border border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20"
                            : "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20",
                        ].join(" ")}
                      >
                        {user.isActive ? "Deactivate" : "Reactivate"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-[2rem] border border-[#2D2D3F] bg-[#1E1E2C] p-6 shadow-2xl sm:p-8">
            <div className="flex items-center justify-between border-b border-[#2D2D3F] pb-4">
              <h3 className="text-xl font-bold text-white">Create New Staff Account</h3>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="text-[#94A3B8] hover:text-white transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#94A3B8]">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="e.g. Maria Santos"
                  className="mt-2 w-full rounded-xl border border-[#2D2D3F] bg-[#161622] px-4 py-3 text-sm text-white placeholder-[#64748B] focus:border-[#3B8FF3] focus:outline-none focus:ring-2 focus:ring-[#3B8FF3]/30 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#94A3B8]">
                  Staff Email Address
                </label>
                <input
                  type="email"
                  required
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                  placeholder="e.g. maria.santos@school.edu"
                  className="mt-2 w-full rounded-xl border border-[#2D2D3F] bg-[#161622] px-4 py-3 text-sm text-white placeholder-[#64748B] focus:border-[#3B8FF3] focus:outline-none focus:ring-2 focus:ring-[#3B8FF3]/30 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#94A3B8]">
                  Assigned Role
                </label>
                <select
                  value={createRole}
                  onChange={(e) =>
                    setCreateRole(e.target.value as "ADMIN" | "DISCIPLINE_OFFICE_STAFF")
                  }
                  className="mt-2 w-full rounded-xl border border-[#2D2D3F] bg-[#161622] px-4 py-3 text-sm text-white focus:border-[#3B8FF3] focus:outline-none focus:ring-2 focus:ring-[#3B8FF3]/30 transition"
                >
                  <option value="DISCIPLINE_OFFICE_STAFF">Discipline Office Staff</option>
                  <option value="ADMIN">Administrator</option>
                </select>
              </div>

              <div className="rounded-xl border border-[#F29F67]/30 bg-[#F29F67]/10 p-4 text-xs leading-5 text-[#F29F67]">
                <strong>Password Policy Note:</strong> Initial password is set automatically to{" "}
                <code className="rounded bg-[#161622] px-1.5 py-0.5 text-white">gmcnufv2026</code>.
                The user will be required to change password on first login.
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-[#2D2D3F]">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-xl border border-[#2D2D3F] bg-[#242436] px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/5 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-[#3B8FF3] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#3B8FF3]/25 hover:bg-[#2575dc] transition disabled:opacity-50"
                >
                  {isSubmitting ? "Creating..." : "Create Staff Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Role Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-[2rem] border border-[#2D2D3F] bg-[#1E1E2C] p-6 shadow-2xl sm:p-8">
            <div className="flex items-center justify-between border-b border-[#2D2D3F] pb-4">
              <h3 className="text-xl font-bold text-white">Edit Role: {editingUser.name}</h3>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="text-[#94A3B8] hover:text-white transition"
              >
                ✕
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <p className="text-xs text-[#94A3B8]">
                Select the new access role for <strong>{editingUser.email}</strong>:
              </p>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => handleUpdateRole(editingUser, "DISCIPLINE_OFFICE_STAFF")}
                  className={[
                    "w-full rounded-xl border p-4 text-left transition flex items-center justify-between",
                    editingUser.role === "DISCIPLINE_OFFICE_STAFF"
                      ? "border-[#3B8FF3] bg-[#3B8FF3]/15 text-white"
                      : "border-[#2D2D3F] bg-[#161622] text-[#94A3B8] hover:border-white/20 hover:text-white",
                  ].join(" ")}
                >
                  <div>
                    <p className="font-semibold">Discipline Office Staff</p>
                    <p className="text-xs opacity-75">Review, verify, and generate certificates.</p>
                  </div>
                  {editingUser.role === "DISCIPLINE_OFFICE_STAFF" && (
                    <span className="text-[#3B8FF3] font-bold">✓</span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleUpdateRole(editingUser, "ADMIN")}
                  className={[
                    "w-full rounded-xl border p-4 text-left transition flex items-center justify-between",
                    editingUser.role === "ADMIN"
                      ? "border-[#F29F67] bg-[#F29F67]/15 text-white"
                      : "border-[#2D2D3F] bg-[#161622] text-[#94A3B8] hover:border-white/20 hover:text-white",
                  ].join(" ")}
                >
                  <div>
                    <p className="font-semibold">Administrator</p>
                    <p className="text-xs opacity-75">Full access including User Management.</p>
                  </div>
                  {editingUser.role === "ADMIN" && (
                    <span className="text-[#F29F67] font-bold">✓</span>
                  )}
                </button>
              </div>

              <div className="mt-6 flex justify-end pt-4 border-t border-[#2D2D3F]">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="rounded-xl border border-[#2D2D3F] bg-[#242436] px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/5 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
