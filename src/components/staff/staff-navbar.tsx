"use client";

import Link from "next/link";
import { formatStaffRoleLabel } from "@/lib/gmc-request";

interface StaffNavbarProps {
  staffUser: {
    name: string;
    email: string;
    role: string;
  };
}

export default function StaffNavbar({ staffUser }: StaffNavbarProps) {
  const initials = staffUser.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join("");

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-[#2D2D3F] bg-[#1E1E2C] px-4 sm:px-6 text-white shadow-md">
      {/* Left: Logo mark + Org/Product name + Subtitle + Divider */}
      <div className="flex items-center gap-4 min-w-0">
        <Link
          href="/staff"
          className="flex items-center gap-3 shrink-0 rounded-lg p-1 transition focus:outline-none focus:ring-2 focus:ring-[#3B8FF3]"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#3B8FF3] to-[#2563EB] text-white font-bold shadow-sm">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0112 20.055a11.952 11.952 0 01-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
            </svg>
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white leading-tight">
              GMC Web
            </h1>
          </div>
        </Link>

        {/* Vertical Divider */}
        <div className="hidden md:block h-8 w-px bg-[#2D2D3F] shrink-0" />

        {/* Subtitle */}
        <p className="hidden md:block text-xs text-[#94A3B8] truncate max-w-md">
          Review, verify, and manage incoming Good Moral Certificate requests
        </p>
      </div>

      {/* Right: Search, Notification Bell, User block */}
      <div className="flex items-center gap-3 sm:gap-4 shrink-0">
        {/* Search Input */}
        <div className="relative hidden sm:block w-48 lg:w-64">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <svg className="h-4 w-4 text-[#94A3B8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="search"
            placeholder="Search requests..."
            className="w-full rounded-lg border border-[#2D2D3F] bg-[#161622] py-1.5 pl-9 pr-3 text-xs text-white placeholder-[#94A3B8] transition focus:border-[#3B8FF3] focus:outline-none focus:ring-1 focus:ring-[#3B8FF3]"
          />
        </div>

        {/* Notification Bell */}
        <button
          type="button"
          aria-label="View notifications"
          className="relative rounded-lg p-2 text-[#94A3B8] transition hover:bg-white/5 hover:text-white focus:outline-none focus:ring-2 focus:ring-[#3B8FF3]"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[#F29F67] ring-2 ring-[#1E1E2C]" />
        </button>

        {/* User Block */}
        <div className="flex items-center gap-2.5 pl-3 border-l border-[#2D2D3F]">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#3B8FF3] text-xs font-bold text-white shadow-inner shrink-0">
            {initials || "DO"}
          </div>
          <div className="hidden sm:flex flex-col text-left">
            <span className="text-xs font-semibold text-white leading-tight">
              {staffUser.name}
            </span>
            <span className="text-[10px] font-medium uppercase tracking-wider text-[#94A3B8] leading-tight mt-0.5">
              {formatStaffRoleLabel(staffUser.role)}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
