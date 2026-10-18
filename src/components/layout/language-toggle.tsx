"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Languages } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { LOCALES, type Locale } from "@/i18n/config";
import { setLocaleAction } from "@/server/actions/prefs";
import { cn } from "@/lib/utils";

/** One tap language switch. Shows the other language in its own script ("हिन्दी" on English pages, "English" on Hindi pages). */
export function LanguageToggle({ locales, className }: { locales: Locale[]; className?: string }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();
  const other = locales.find((l) => l !== locale);
  if (!other) return null;
  return (
    <button
      type="button"
      disabled={pending}
      aria-busy={pending || undefined}
      onClick={() =>
        start(async () => {
          await setLocaleAction(other);
          router.refresh();
        })
      }
      className={cn("tap inline-flex items-center gap-1.5 rounded-xl px-2.5 text-sm font-semibold text-fg hover:bg-surface-2 disabled:opacity-60", className)}
    >
      <Languages className="size-5 shrink-0 text-fg-muted lg:max-xl:hidden" aria-hidden />
      <span className="sr-only">{t("Change language:")} </span>
      <span lang={other}>{LOCALES[other].native}</span>
    </button>
  );
}
