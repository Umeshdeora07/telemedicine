"use client";

import { useClientValue } from "@/lib/use-client-value";
import { useEffect, useState } from "react";
import { Download, Smartphone } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { Button } from "@/components/ui/button";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/** "Add to home screen": installs the PWA on Android/desktop; shows steps on iPhone. */
export function InstallPrompt() {
  const { t } = useI18n();
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const ios = useClientValue(() => /iphone|ipad|ipod/i.test(navigator.userAgent), false);
  const installed = useClientValue(() => window.matchMedia("(display-mode: standalone)").matches, false);
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setEvt(e as BIPEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);
  if (installed) return <p className="text-on-navy/90">{t("You're using the installed app. Thank you!")}</p>;
  if (evt)
    return (
      <Button variant="accent" size="lg" onClick={() => evt.prompt().then(() => setEvt(null))}>
        <Download className="size-5" aria-hidden />
        {t("Install the app")}
      </Button>
    );
  return (
    <p className="flex items-start gap-2 text-navy-muted">
      <Smartphone className="mt-1 size-5 shrink-0 text-accent" aria-hidden />
      {ios
        ? t("On iPhone: tap the Share button, then 'Add to Home Screen'.")
        : t("Open this site in Chrome on your phone and choose 'Install app' or 'Add to Home screen' from the menu.")}
    </p>
  );
}
