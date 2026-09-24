"use client";

import { useEffect } from "react";

/** One page view per load, counted server-side. No cookies, no third party. */
export default function Beacon() {
  useEffect(() => {
    try {
      navigator.sendBeacon?.("/api/hit");
    } catch {}
  }, []);
  return null;
}
