"use client";

import { useState, type FormEvent } from "react";

interface StaffChangePasswordClientProps {
  staffUser: {
    name: string;
    email: string;
    role: string;
  };
}

export default function StaffChangePasswordClient({
  staffUser,
}: StaffChangePasswordClientProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!currentPassword) {
      setErrorMessage("Please enter your current password.");
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage("New password must be at least 8 characters long.");
      return;
    }

    if (newPassword === "gmcnufv2026") {
      setErrorMessage("New password cannot be the default password (gmcnufv2026).");
      return;
    }

    if (newPassword === currentPassword) {
      setErrorMessage("New password must be different from your current password.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("New password and confirm password do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/staff/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error || "Failed to change password.");
        setIsSubmitting(false);
        return;
      }

      window.location.href = data.redirectUrl || "/staff";
    } catch (err) {
      console.error(err);
      setErrorMessage("Network error. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl py-8">
      <div className="overflow-hidden rounded-[2rem] border border-[#2D2D3F] bg-[#1E1E2C] p-8 shadow-2xl">
        {/* Header Block */}
        <div className="border-b border-[#2D2D3F] pb-6">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-3 w-3 rounded-full bg-[#F29F67] animate-pulse" />
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#F29F67]">
              Action Required
            </p>
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white">
            Change Your Password
          </h1>
          <p className="mt-2 text-sm leading-6 text-[#94A3B8]">
            For security purposes, you must change your initial password before accessing the GMC Web system.
          </p>
        </div>

        {/* User Info Badge */}
        <div className="mt-6 rounded-xl border border-[#2D2D3F] bg-[#242436] p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-white">{staffUser.name}</p>
            <p className="text-xs text-[#94A3B8]">{staffUser.email}</p>
          </div>
          <span className="rounded-full bg-[#3B8FF3]/15 px-3 py-1 text-xs font-semibold text-[#3B8FF3] uppercase tracking-wider">
            {staffUser.role.replace(/_/g, " ")}
          </span>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div
            role="alert"
            className="mt-6 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm font-medium text-rose-300 flex items-start gap-3"
          >
            <svg className="h-5 w-5 shrink-0 text-rose-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div>
            <label
              htmlFor="currentPassword"
              className="block text-xs font-bold uppercase tracking-wider text-[#94A3B8]"
            >
              Current Password
            </label>
            <div className="relative mt-2">
              <input
                id="currentPassword"
                type={showCurrentPassword ? "text" : "password"}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter initial password (gmcnufv2026)"
                className="w-full rounded-xl border border-[#2D2D3F] bg-[#161622] pl-4 pr-12 py-3 text-sm text-white placeholder-[#64748B] focus:border-[#3B8FF3] focus:outline-none focus:ring-2 focus:ring-[#3B8FF3]/30 transition"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                aria-label={showCurrentPassword ? "Hide current password" : "Show current password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#94A3B8] hover:text-white transition focus:outline-none"
              >
                {showCurrentPassword ? (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858-5.908a10.025 10.025 0 014.122-.963c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21M3 3l18 18" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="newPassword"
              className="block text-xs font-bold uppercase tracking-wider text-[#94A3B8]"
            >
              New Password
            </label>
            <div className="relative mt-2">
              <input
                id="newPassword"
                type={showNewPassword ? "text" : "password"}
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters (different from default)"
                className="w-full rounded-xl border border-[#2D2D3F] bg-[#161622] pl-4 pr-12 py-3 text-sm text-white placeholder-[#64748B] focus:border-[#3B8FF3] focus:outline-none focus:ring-2 focus:ring-[#3B8FF3]/30 transition"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                aria-label={showNewPassword ? "Hide new password" : "Show new password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#94A3B8] hover:text-white transition focus:outline-none"
              >
                {showNewPassword ? (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858-5.908a10.025 10.025 0 014.122-.963c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21M3 3l18 18" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            <p className="mt-1 text-xs text-[#64748B]">
              Minimum 8 characters. Cannot be default (gmcnufv2026) or current password.
            </p>
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-xs font-bold uppercase tracking-wider text-[#94A3B8]"
            >
              Confirm New Password
            </label>
            <div className="relative mt-2">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full rounded-xl border border-[#2D2D3F] bg-[#161622] pl-4 pr-12 py-3 text-sm text-white placeholder-[#64748B] focus:border-[#3B8FF3] focus:outline-none focus:ring-2 focus:ring-[#3B8FF3]/30 transition"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#94A3B8] hover:text-white transition focus:outline-none"
              >
                {showConfirmPassword ? (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858-5.908a10.025 10.025 0 014.122-.963c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21M3 3l18 18" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-[#3B8FF3] py-3.5 text-sm font-bold text-white shadow-lg shadow-[#3B8FF3]/25 transition hover:bg-[#2575dc] focus:outline-none focus:ring-2 focus:ring-[#3B8FF3] disabled:opacity-50 mt-4 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <svg className="h-5 w-5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span>Updating Password...</span>
              </>
            ) : (
              <span>Update Password & Continue</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
