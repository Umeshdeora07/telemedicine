"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { setTimeZoneAction } from "@/server/actions/prefs";

/**
 * Small client-only jobs for every page:
 *  - remember the device time zone so times are shown correctly
 *  - register the service worker (installable app, offline pages)
 *  - follow the OS dark-mode setting while "Same as device" is chosen
 */
export function ClientEffects({ serverTz, hasTzCookie }: { serverTz: string; hasTzCookie: boolean }) {
  const router = useRouter();
  useEffect(() => {
    const raw = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const tz = raw === "Asia/Calcutta" ? "Asia/Kolkata" : raw;
    if (tz && (!hasTzCookie || tz !== serverTz)) {
      void setTimeZoneAction(tz).then(() => router.refresh());
    }
  }, [serverTz, hasTzCookie, router]);

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  useEffect(() => {
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const pref = document.cookie.match(/(?:^|; )pref_theme=([^;]+)/)?.[1] ?? "system";
      if (pref === "system") document.documentElement.classList.toggle("dark", mq.matches);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return null;
}
