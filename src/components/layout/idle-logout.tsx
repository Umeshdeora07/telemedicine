"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/i18n/client";
import { Button } from "@/components/ui/button";

/**
 * Automatic logout after inactivity (doctors, clinic staff, coordinators and
 * admins). Warns 2 minutes before, and keeps the server session alive while
 * the person is actively working (e.g. typing long notes).
 */
export function IdleLogout({ minutes }: { minutes: number }) {
  const { t } = useI18n();
  const [warn, setWarn] = useState(false);
  const last = useRef(Date.now());
  const lastPing = useRef(Date.now());

  useEffect(() => {
    const activity = () => {
      last.current = Date.now();
      if (Date.now() - lastPing.current > 4 * 60_000) {
        lastPing.current = Date.now();
        void fetch("/api/auth/ping", { method: "POST" });
      }
    };
    const events = ["pointerdown", "keydown", "scroll", "touchstart"] as const;
    events.forEach((e) => window.addEventListener(e, activity, { passive: true }));
    const timer = setInterval(() => {
      const idle = (Date.now() - last.current) / 60_000;
      if (idle >= minutes) {
        window.location.href = "/api/auth/logout?reason=idle";
      } else setWarn(idle >= minutes - 2);
    }, 10_000);
    return () => {
      events.forEach((e) => window.removeEventListener(e, activity));
      clearInterval(timer);
    };
  }, [minutes]);

  if (!warn) return null;
  return (
    <div role="alertdialog" aria-live="assertive" className="fixed inset-x-3 top-20 z-[60] mx-auto max-w-md">
      <div className="card space-y-3 border-warning p-4 shadow-xl">
        <p className="font-semibold text-heading">{t("You'll be logged out soon")}</p>
        <p className="text-[0.9375rem]">{t("For patient privacy, we log you out after {minutes} minutes without activity.", { minutes })}</p>
        <Button
          size="sm"
          onClick={() => {
            last.current = Date.now();
            lastPing.current = Date.now();
            void fetch("/api/auth/ping", { method: "POST" });
            setWarn(false);
          }}
        >
          {t("Stay logged in")}
        </Button>
      </div>
    </div>
  );
}
