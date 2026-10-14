"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/client";
import { Button } from "@/components/ui/button";

/** We only use essential cookies by default; analytics need opt-in. */
export function CookieBanner() {
  const { t } = useI18n();
  const [show, setShow] = useState(false);
  useEffect(() => {
    setShow(!document.cookie.includes("cookie_choice="));
  }, []);
  if (!show) return null;
  const choose = (v: "essential" | "all") => {
    document.cookie = `cookie_choice=${v}; path=/; max-age=${60 * 60 * 24 * 180}; samesite=lax`;
    setShow(false);
  };
  return (
    <div role="region" aria-label={t("Cookies")} className="fixed inset-x-3 bottom-20 z-50 md:bottom-4 md:start-auto md:end-4 md:w-[26rem]">
      <div className="card space-y-3 p-4 shadow-xl">
        <p className="text-[0.9375rem]">
          {t("We use essential cookies to keep you signed in and remember your language. With your permission we'd also use anonymous analytics to improve the service.")}{" "}
          <Link href="/legal/cookies" className="text-primary underline">
            {t("Cookie policy")}
          </Link>
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => choose("essential")} variant="outline">
            {t("Essential only")}
          </Button>
          <Button size="sm" onClick={() => choose("all")}>
            {t("Allow analytics")}
          </Button>
        </div>
      </div>
    </div>
  );
}
