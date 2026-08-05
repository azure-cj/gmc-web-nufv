"use client";

import { useState } from "react";

interface StaffLoginFormProps {
  errorMessage?: string | null;
}

export default function StaffLoginForm({ errorMessage }: StaffLoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="max-w-md">
      <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
        Secure login
      </p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#1E1E2C]">
        Enter your credentials
      </h2>
      <p className="mt-3 text-sm leading-7 text-slate-600">
        Use your school-issued staff email and password to continue.
      </p>

      {errorMessage ? (
        <div className="mt-6 rounded-2xl border border-[#E05252]/40 bg-[#E05252]/10 px-4 py-3 text-sm text-[#9B2C2C]">
          {errorMessage}
        </div>
      ) : null}

      <form action="/api/staff/session" method="post" className="mt-8 space-y-6">
        <input type="hidden" name="returnTo" value="/staff" />

        <label className="block">
          <span className="text-sm font-medium text-slate-700">Email address</span>
          <input
            type="email"
            name="email"
            autoComplete="email"
            required
            className="mt-2 block w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-[#3B8FF3] focus:ring-4 focus:ring-[#3B8FF3]/20"
            placeholder="staff@school.edu"
          />
        </label>

        <div>
          <label className="block text-sm font-medium text-slate-700">Password</label>
          <div className="relative mt-2">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              autoComplete="current-password"
              required
              className="block w-full rounded-2xl border border-slate-300 bg-white pl-4 pr-12 py-3 text-slate-900 outline-none transition focus:border-[#3B8FF3] focus:ring-4 focus:ring-[#3B8FF3]/20"
              placeholder="Enter your password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition focus:outline-none"
            >
              {showPassword ? (
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

        <div className="rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-600">
          Invalid credentials are reported with a generic error message for security.
        </div>

        <button
          type="submit"
          className="inline-flex w-full items-center justify-center rounded-2xl bg-[#F29F67] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#e08e56] shadow-sm"
        >
          Sign In
        </button>
      </form>
    </div>
  );
}
