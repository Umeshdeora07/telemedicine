import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getI18n } from "@/i18n/server";
import { enabledLocales } from "@/i18n/config";
import { Card } from "@/components/ui/card";
import { Stepper } from "@/components/ui/stepper";
import { requireSession } from "@/server/auth/session";
import { homeFor, isStaff } from "@/server/auth/roles";
import { getCountries } from "@/server/queries/reference";
import { getViewerRegion } from "@/lib/prefs";
import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = { title: "Welcome" };

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const session = await requireSession({ allowNotOnboarded: true, allowWithoutMfa: true });
  if (session.user.onboarded || isStaff(session.user.role)) redirect(homeFor(session.user.role));
  const { t, locale } = await getI18n();
  const countries = (await getCountries()).filter((c) => c.enabled);
  const { tz } = await getViewerRegion(session.user);
  return (
    <Card className="mx-auto max-w-xl space-y-6 p-6 sm:p-8">
      <Stepper current={1} total={2} label={t("Step {current} of {total}", { current: 1, total: 2 })} />
      <div className="space-y-2">
        <h1 className="text-2xl font-extrabold">{t("Welcome! Tell us a little about you")}</h1>
        <p className="text-fg-muted">{t("This takes about a minute. You can add family members next.")}</p>
      </div>
      <OnboardingForm
        next={next}
        countries={countries.map((c) => ({ code: c.code, name: c.name }))}
        locales={enabledLocales()}
        defaults={{ name: session.user.name, country: session.user.countryCode, language: locale, timeZone: tz, hasEmail: Boolean(session.user.email) }}
      />
    </Card>
  );
}
