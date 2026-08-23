"use client";

import Image from "next/image";
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
          className="flex items-center gap-3 shrink-0 rounded-lg p-1 transition focus:outline-none focus:ring-2 focus:ring-[#E0C07A]"
        >
          <Image
            src="/images/brand/gmclogo.png"
            alt="GMC logo"
            width={36}
            height={36}
            className="h-9 w-9 object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)]"
            priority
          />
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

      {/* Right: Search and user block */}
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
