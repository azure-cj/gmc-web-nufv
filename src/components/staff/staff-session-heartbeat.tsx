"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

const HEARTBEAT_INTERVAL_MS = 15 * 60 * 1000;

export default function StaffSessionHeartbeat() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function refreshSession() {
      try {
        const response = await fetch("/api/staff/session/refresh", {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ pathname }),
        });

        if (cancelled) {
          return;
        }

        if (response.status === 401) {
          router.replace("/staff/login");
        }
      } catch (error) {
        console.error("Staff session heartbeat failed:", error);
      }
    }

    refreshSession();
    const timer = window.setInterval(refreshSession, HEARTBEAT_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [pathname, router]);

  return null;
}
