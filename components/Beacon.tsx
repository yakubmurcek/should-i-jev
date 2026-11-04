"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** The private stats page is the owner reading numbers, not a visit. */
export const countsAsVisit = (path: string | null) => !path?.startsWith("/stats");

/** One page view per load, counted server-side. No cookies, no third party. */
export default function Beacon() {
  const path = usePathname();
  useEffect(() => {
    if (!countsAsVisit(path)) return;
    try {
      navigator.sendBeacon?.("/api/hit");
    } catch {}
    // Once per page load, as before: client-side navigation is not a new visit.
  }, []);
  return null;
}
