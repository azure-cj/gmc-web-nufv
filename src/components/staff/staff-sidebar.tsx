"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface StaffSidebarProps {
  staffUser?: {
    name: string;
    email: string;
    role: string;
  };
}

const NAV_ITEMS = [
  {
    href: "/staff",
    label: "Dashboard",
    icon: (
      <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
  },
  {
    href: "/staff/gmc-requests",
    label: "GMC Requests",
    icon: (
      <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    href: "/staff/issued-certificates",
    label: "Issued Certificates",
    icon: (
      <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
      </svg>
    ),
  },
  {
    href: "/staff/records-archive",
    label: "Records Archive",
    icon: (
      <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v1a2 2 0 01-2 2M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
      </svg>
    ),
  },
  {
    href: "/staff/settings",
    label: "Settings",
    icon: (
      <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    href: "/staff/users",
    label: "Users",
    adminOnly: true,
    icon: (
      <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 100 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
] as const;

function isActivePath(pathname: string, href: string): boolean {
  if (href === "/staff") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function StaffSidebar({ staffUser }: StaffSidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const savedState = localStorage.getItem("gmc_sidebar_collapsed");
    if (savedState !== null) {
      setIsCollapsed(savedState === "true");
    }
  }, []);

  const toggleCollapse = () => {
    const nextState = !isCollapsed;
    setIsCollapsed(nextState);
    if (typeof window !== "undefined") {
      localStorage.setItem("gmc_sidebar_collapsed", String(nextState));
    }
  };

  return (
    <aside
      aria-label="Sidebar navigation"
      className={[
        "sticky top-16 h-[calc(100vh-4rem)] flex flex-col border-r border-[#2D2D3F] bg-[#1E1E2C] text-slate-100 transition-[width] duration-200 ease-in-out shrink-0 self-start z-30",
        isMounted && isCollapsed ? "w-20" : "w-64",
      ].join(" ")}
    >
      {/* Sidebar Top / Toggle Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#2D2D3F] shrink-0">
        {!isCollapsed && (
          <div className="overflow-hidden whitespace-nowrap transition-opacity duration-200">
            <span className="text-xs font-bold uppercase tracking-wider text-[#F29F67]">
              Navigation
            </span>
          </div>
        )}
        <button
          type="button"
          onClick={toggleCollapse}
          aria-expanded={!isCollapsed}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[#94A3B8] transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-[#3B8FF3] mx-auto"
        >
          <svg
            className={[
              "h-5 w-5 transition-transform duration-200",
              isCollapsed ? "rotate-180" : "",
            ].join(" ")}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* Nav List */}
      <nav className="my-3 flex-1 min-h-0 space-y-1.5 px-3 overflow-y-auto scrollbar-thin">
        {NAV_ITEMS.map((item) => {
          if ("adminOnly" in item && item.adminOnly && staffUser?.role !== "ADMIN") {
            return null;
          }

          const active = isActivePath(pathname, item.href);

          return (
            <div key={item.href} className="relative group">
              <Link
                href={item.href}
                className={[
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  active
                    ? "bg-[#3B8FF3] text-white shadow-md font-semibold"
                    : "text-[#94A3B8] hover:bg-white/5 hover:text-white",
                  isCollapsed ? "justify-center px-0" : "",
                ].join(" ")}
              >
                <div className={active ? "text-white" : "text-[#94A3B8] group-hover:text-white"}>
                  {item.icon}
                </div>

                {!isCollapsed && (
                  <span className="truncate transition-opacity duration-200">
                    {item.label}
                  </span>
                )}
              </Link>

              {/* Hover Tooltip when Collapsed */}
              {isCollapsed && (
                <div
                  role="tooltip"
                  className="pointer-events-none absolute left-full top-1/2 ml-3 -translate-y-1/2 rounded-md bg-[#161622] px-3 py-1.5 text-xs font-medium text-white shadow-xl opacity-0 transition-opacity group-hover:opacity-100 z-50 whitespace-nowrap border border-[#2D2D3F]"
                >
                  {item.label}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer / Logout */}
      <div className="p-3 mt-auto border-t border-[#2D2D3F] shrink-0">
        <form action="/api/staff/logout" method="post">
          <button
            type="submit"
            aria-label="Logout"
            className={[
              "flex w-full items-center gap-3 rounded-lg border border-[#2D2D3F] bg-white/5 px-3 py-2.5 text-sm font-medium text-[#94A3B8] transition hover:bg-rose-500/10 hover:text-rose-300 hover:border-rose-500/20 focus:outline-none focus:ring-2 focus:ring-rose-400",
              isCollapsed ? "justify-center px-0" : "",
            ].join(" ")}
          >
            <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {!isCollapsed && <span>Logout</span>}
          </button>
        </form>
      </div>
    </aside>
  );
}
