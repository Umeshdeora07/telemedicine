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
import { ConsentToggles, DeleteAccountForm, DisplayForm, LanguageForm, PricesAndTimesForm, PushOptIn } from "@/components/patient/settings-forms";

export const metadata: Metadata = { title: "Settings" };

/** Names for the consent types listed in the history. */
const CONSENT_LABELS: Record<string, string> = {
  terms: "Terms of use",
  privacy: "Privacy policy",
  telemedicine: "Online consultation consent",
  whatsapp: "Reminders on WhatsApp",
  marketing: "Health tips and offers",
  research: "Help improve care",
  records_sharing: "Sharing records",
  abha: "ABHA linking",
  international_data_transfer: "Storing my data in India",
};

export default async function SettingsPage() {
  const ctx = await getViewContext();
  const { t, fmt, user, locale } = ctx;
  const [prefs, region, c] = await Promise.all([getPrefs(), getViewerRegion(user), consentState(user!.id)]);
  const granted = (type: string) => c.latest(type)?.granted ?? false;
  const history = c.rows.filter((r) => r.type in CONSENT_LABELS).slice(0, 20);
  const languages = enabledLocales();
  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title={t("Settings")} description={languages.length > 1 ? t("Language, appearance, notifications and privacy.") : t("Appearance, notifications and privacy.")} />

      <section className="card space-y-5 p-5" aria-labelledby="look">
        <h2 id="look" className="text-lg font-bold">{languages.length > 1 ? t("Language and appearance") : t("Appearance")}</h2>
        {languages.length > 1 ? <LanguageForm locale={locale} locales={languages.map((l) => ({ code: l, name: LOCALES[l].native }))} /> : null}
        <DisplayForm theme={prefs.theme} />
      </section>

      <section className="card space-y-4 p-5" aria-labelledby="prices">
        <h2 id="prices" className="text-lg font-bold">{t("Prices and times")}</h2>
        <PricesAndTimesForm currency={region.currency} currencies={[...CURRENCY_CODES]} tz={region.tz} zones={[...COMMON_TIME_ZONES]} />
      </section>

      <section className="card space-y-4 p-5" aria-labelledby="notify">
        <h2 id="notify" className="text-lg font-bold">{t("Notifications")}</h2>
        <p className="text-fg-muted">{t("We always send booking confirmations and reminders by text message and email. Choose what else you would like.")}</p>
        <ConsentToggles
          items={[
            { type: "whatsapp", label: t("Reminders on WhatsApp"), hint: t("Consultation reminders and links on WhatsApp, as well as text messages."), granted: granted("whatsapp") },
            { type: "marketing", label: t("Health tips and offers"), hint: t("Occasional emails about our services and offers."), granted: granted("marketing") },
          ]}
        />
        <PushOptIn />
      </section>

      <section className="card space-y-4 p-5" aria-labelledby="privacy">
        <h2 id="privacy" className="text-lg font-bold">{t("Privacy")}</h2>
        <ConsentToggles
          items={[
            { type: "research", label: t("Help improve care (anonymised)"), hint: t("Use my data, with names and contact details removed, to improve the service."), granted: granted("research") },
          ]}
        />
        <p className="text-sm">
          <Link href="/family" className="text-primary underline">{t("Who can help with my care")}</Link>
          {" · "}
          <Link href="/records" className="text-primary underline">{t("Who can see my records")}</Link>
          {" · "}
          <Link href="/legal/privacy" className="text-primary underline">{t("Privacy policy")}</Link>
        </p>
        <hr className="border-line" />
        <h3 className="font-bold">{t("Your data")}</h3>
        <p className="text-fg-muted">{t("Download a copy of everything we hold about you and the family members you manage.")}</p>
        <a href="/api/me/export" className={buttonClass("secondary")}>
          <Download className="size-5" aria-hidden />
          {t("Download my data")}
        </a>
        {history.length ? (
          <details>
            <summary className="tap inline-flex cursor-pointer items-center font-medium text-primary">{t("Consent history")}</summary>
            <ul className="mt-2 space-y-1 text-sm">
              {history.map((h) => (
                <li key={h.id}>
                  {fmt.dateTime(h.createdAt)} · {t(CONSENT_LABELS[h.type] ?? h.type)} · {h.granted ? t("agreed") : t("withdrawn")}
                </li>
              ))}
            </ul>
          </details>
        ) : null}
        <hr className="border-line" />
        <DeleteAccountForm />
      </section>
    </div>
  );
}
