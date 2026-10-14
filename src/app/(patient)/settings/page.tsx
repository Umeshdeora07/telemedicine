import type { Metadata } from "next";
import Link from "next/link";
import { Download } from "lucide-react";
import { getViewContext } from "@/server/context";
import { consentState } from "@/server/patient-app";
import { getPrefs, getViewerRegion } from "@/lib/prefs";
import { enabledLocales, LOCALES } from "@/i18n/config";
import { CURRENCY_CODES } from "@/config/currencies";
import { COMMON_TIME_ZONES } from "@/lib/time";
import { PageHeader } from "@/components/ui/page-header";
import { buttonClass } from "@/components/ui/button";
import { DisplayPrefsPanel } from "@/components/layout/prefs-menu";
import { ConsentToggles, DeleteAccountForm, RegionForm } from "@/components/patient/settings-forms";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const ctx = await getViewContext();
  const { t, fmt, user, locale } = ctx;
  const [prefs, region, c] = await Promise.all([getPrefs(), getViewerRegion(user), consentState(user!.id)]);
  const granted = (type: string) => c.latest(type)?.granted ?? false;
  const history = c.rows.filter((r) => ["terms", "privacy", "telemedicine", "whatsapp", "marketing", "research", "records_sharing", "abha", "international_data_transfer", "emergency_card"].includes(r.type)).slice(0, 20);
  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title={t("Settings")} description={t("Language, display and privacy.")} />
      <section className="card space-y-4 p-5" aria-labelledby="region">
        <h2 id="region" className="text-lg font-bold">{t("Language, currency and time")}</h2>
        <RegionForm locale={locale} locales={enabledLocales().map((l) => ({ code: l, name: LOCALES[l].native }))} currency={region.currency} currencies={[...CURRENCY_CODES]} tz={region.tz} zones={[...COMMON_TIME_ZONES]} />
      </section>
      <section className="card space-y-4 p-5" aria-labelledby="display">
        <h2 id="display" className="text-lg font-bold">{t("Display")}</h2>
        <DisplayPrefsPanel initial={{ theme: prefs.theme, text: prefs.text, contrast: prefs.contrast, motion: prefs.motion }} />
      </section>
      <section className="card space-y-4 p-5" aria-labelledby="privacy">
        <h2 id="privacy" className="text-lg font-bold">{t("Privacy choices")}</h2>
        <ConsentToggles
          items={[
            { type: "whatsapp", label: t("Reminders on WhatsApp"), hint: t("Consult reminders and links on WhatsApp, in addition to SMS."), granted: granted("whatsapp") },
            { type: "research", label: t("Help improve care (anonymised)"), hint: t("Use my data, with names and contact details removed, to improve the service."), granted: granted("research") },
            { type: "marketing", label: t("Health tips and offers"), hint: t("Occasional emails about health camps, plans and offers."), granted: granted("marketing") },
          ]}
        />
        <p className="text-sm"><Link href="/family" className="text-primary underline">{t("Who can help with my care")}</Link> · <Link href="/records" className="text-primary underline">{t("Who can see my records")}</Link> · <Link href="/legal/privacy" className="text-primary underline">{t("Privacy policy")}</Link></p>
      </section>
      <section className="card space-y-3 p-5" aria-labelledby="data">
        <h2 id="data" className="text-lg font-bold">{t("Your data")}</h2>
        <p className="text-fg-muted">{t("Download a copy of everything we hold about you and the family members you manage.")}</p>
        <a href="/api/me/export" className={buttonClass("secondary")}><Download className="size-5" aria-hidden />{t("Download my data")}</a>
        <details>
          <summary className="tap inline-flex cursor-pointer items-center font-medium text-primary">{t("Consent history")}</summary>
          <ul className="mt-2 space-y-1 text-sm">
            {history.map((h) => <li key={h.id}>{fmt.dateTime(h.createdAt)} · {h.type.replace(/_/g, " ")} · {h.granted ? t("agreed") : t("withdrawn")} ({h.method.replace(/_/g, " ")})</li>)}
          </ul>
        </details>
        <hr className="border-line" />
        <DeleteAccountForm />
      </section>
    </div>
  );
}
