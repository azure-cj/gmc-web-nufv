"use client";

import { useState } from "react";

interface StaffLoginFormProps {
  errorMessage?: string | null;
}

export default function StaffLoginForm({ errorMessage }: StaffLoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="mx-auto w-full max-w-lg">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-50 text-sky-600 shadow-sm ring-1 ring-sky-100">
          <svg
            aria-hidden="true"
            className="h-4.5 w-4.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>
        <span className="text-xs font-bold uppercase tracking-[0.32em] text-[#2C4368]">
          Secure Login
        </span>
      </div>

      <h2 className="mt-5 text-[2rem] font-extrabold tracking-tight text-[#102040] sm:text-[2.15rem]">
        Enter your credentials
      </h2>
      <p className="mt-3 max-w-md text-sm leading-7 text-slate-500">
        Use your school-issued staff email and password to continue.
      </p>

      {errorMessage ? (
        <div className="mt-7 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3.5 text-sm font-medium text-rose-800">
          <svg
            aria-hidden="true"
            className="mt-0.5 h-5 w-5 shrink-0 text-rose-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <span>{errorMessage}</span>
        </div>
      ) : null}

      <form action="/api/staff/session" method="post" className="mt-8 space-y-6">
        <input type="hidden" name="returnTo" value="/staff" />

        <label className="block">
          <span className="text-sm font-semibold text-slate-700">Email Address</span>
          <div className="relative mt-2">
            <input
              type="email"
              name="email"
              autoComplete="email"
              required
              className="block w-full rounded-2xl border border-slate-300 bg-white pl-5 pr-12 py-3.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-[#102040] focus:ring-4 focus:ring-[#102040]/10"
              placeholder="staff@school.edu"
            />
            <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
              <svg
                aria-hidden="true"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
          </div>
        </label>

        {/* Password Field with Eye Toggle Icon */}
        <div>
          <label className="block text-sm font-semibold text-slate-700">Password</label>
          <div className="relative mt-2">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              autoComplete="current-password"
              required
              className="block w-full rounded-2xl border border-slate-300 bg-white pl-5 pr-12 py-3.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-[#102040] focus:ring-4 focus:ring-[#102040]/10"
              placeholder="Enter your password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition focus:outline-none"
            >
              {showPassword ? (
                <svg
                  aria-hidden="true"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858-5.908a10.025 10.025 0 014.122-.963c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21M3 3l18 18"
                  />
                </svg>
              ) : (
                <svg
                  aria-hidden="true"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <svg
            aria-hidden="true"
            className="mt-0.5 h-5 w-5 shrink-0 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-xs leading-5 text-slate-600">
            Invalid credentials are reported with a generic error message for security.
          </p>
        </div>

        <button
          type="submit"
          className="inline-flex w-full items-center justify-center rounded-2xl bg-[#102040] px-5 py-4 text-base font-bold text-white shadow-lg shadow-[#102040]/20 transition duration-200 hover:bg-[#2C4368] focus:outline-none focus:ring-4 focus:ring-[#102040]/15"
        >
          Sign In
        </button>
      </form>
    </div>
  );
}
