"use client";

import { useClientValue } from "@/lib/use-client-value";
import { useActionState, useState } from "react";
import { useI18n } from "@/i18n/client";
import { completeOnboarding, type OnboardingState } from "@/server/actions/auth";
import { Checkbox, Field, Input, RadioCard, Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/alert";
import { LOCALES, type Locale } from "@/i18n/config";
import { COMMON_TIME_ZONES } from "@/lib/time";
import { HeartHandshake, User, Users } from "lucide-react";

export function OnboardingForm({
  defaults,
  countries,
  locales,
  next,
}: {
  defaults: { name: string; country: string; language: string; timeZone: string; hasEmail: boolean };
  countries: { code: string; name: string }[];
  locales: Locale[];
  next?: string;
}) {
  const { t } = useI18n();
  const [state, action] = useActionState(completeOnboarding, {} as OnboardingState);
  const [forWhom, setForWhom] = useState("self");
  const deviceTz = useClientValue(() => Intl.DateTimeFormat().resolvedOptions().timeZone || defaults.timeZone, defaults.timeZone);
  const [chosenTz, setTz] = useState<string | null>(null);
  const tz = chosenTz ?? deviceTz;
  const fe = state.fieldErrors ?? {};
  const zones = Array.from(new Set([tz, ...COMMON_TIME_ZONES]));
  return (
    <form action={action} className="space-y-6" noValidate>
      <input type="hidden" name="next" value={next ?? ""} />
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      <Field label={t("Your full name")} htmlFor="name" required error={fe.name}>
        <Input id="name" name="name" autoComplete="name" defaultValue={defaults.name} required aria-invalid={Boolean(fe.name)} />
      </Field>

      <fieldset className="space-y-2">
        <legend className="font-medium text-heading">{t("Who is this account for?")}</legend>
        <div className="grid gap-2">
          <RadioCard name="forWhom" value="self" checked={forWhom === "self"} onChange={setForWhom}>
            <User className="size-6 text-primary" aria-hidden />
            <span>
              <span className="block font-semibold">{t("Myself")}</span>
              <span className="text-sm text-fg-muted">{t("I will book consultations for myself")}</span>
            </span>
          </RadioCard>
          <RadioCard name="forWhom" value="both" checked={forWhom === "both"} onChange={setForWhom}>
            <Users className="size-6 text-primary" aria-hidden />
            <span>
              <span className="block font-semibold">{t("Me and my family")}</span>
              <span className="text-sm text-fg-muted">{t("For myself, and for children, parents or others")}</span>
            </span>
          </RadioCard>
          <RadioCard name="forWhom" value="family" checked={forWhom === "family"} onChange={setForWhom}>
            <HeartHandshake className="size-6 text-primary" aria-hidden />
            <span>
              <span className="block font-semibold">{t("Only for someone else")}</span>
              <span className="text-sm text-fg-muted">{t("For example, my parents in India while I live abroad")}</span>
            </span>
          </RadioCard>
        </div>
      </fieldset>

      {forWhom !== "family" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("Date of birth")} htmlFor="dob" required error={fe.dob}>
            <Input id="dob" name="dob" type="date" max={new Date().toISOString().slice(0, 10)} required aria-invalid={Boolean(fe.dob)} />
          </Field>
          <Field label={t("Sex")} htmlFor="sex" required error={fe.sex} hint={t("Doctors need this to treat you safely.")}>
            <Select id="sex" name="sex" defaultValue="" required aria-invalid={Boolean(fe.sex)}>
              <option value="" disabled>
                {t("Choose")}
              </option>
              <option value="female">{t("Female")}</option>
              <option value="male">{t("Male")}</option>
              <option value="other">{t("Other")}</option>
            </Select>
          </Field>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("Country where you live")} htmlFor="country" required>
          <Select id="country" name="country" defaultValue={defaults.country}>
            {countries.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("City")} htmlFor="city" optional={t("optional")}>
          <Input id="city" name="city" autoComplete="address-level2" />
        </Field>
        <Field label={t("Language")} htmlFor="language" required>
          <Select id="language" name="language" defaultValue={defaults.language}>
            {locales.map((l) => (
              <option key={l} value={l} lang={l}>
                {LOCALES[l].native} ({LOCALES[l].english})
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("Time zone")} htmlFor="timeZone" required hint={t("We show every appointment time in this zone.")}>
          <Select id="timeZone" name="timeZone" value={tz} onChange={(e) => setTz(e.target.value)}>
            {zones.map((z) => (
              <option key={z} value={z}>
                {z.replace(/_/g, " ")}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      {!defaults.hasEmail ? (
        <Field label={t("Email for receipts")} htmlFor="email" optional={t("optional")} hint={t("We send invoices and prescriptions here.")}>
          <Input id="email" name="email" type="email" autoComplete="email" />
        </Field>
      ) : null}

      <fieldset className="space-y-3 rounded-xl border border-line p-4">
        <legend className="px-1 font-medium text-heading">{t("Your consent")}</legend>
        <Checkbox
          id="terms"
          name="terms"
          required
          label={
            <>
              {t("I agree to the")} <a className="text-primary underline" href="/legal/terms" target="_blank">{t("Terms of use")}</a> {t("and")}{" "}
              <a className="text-primary underline" href="/legal/privacy" target="_blank">{t("Privacy policy")}</a>.
            </>
          }
        />
        {fe.terms ? <p className="text-sm font-medium text-danger">{fe.terms}</p> : null}
        <Checkbox
          id="telemedicine"
          name="telemedicine"
          required
          label={
            <>
              {t("I understand that online consultations have limits, and the doctor may ask me to visit in person.")}{" "}
              <a className="text-primary underline" href="/legal/telemedicine-consent" target="_blank">{t("Read more")}</a>
            </>
          }
        />
        {fe.telemedicine ? <p className="text-sm font-medium text-danger">{fe.telemedicine}</p> : null}
        <Checkbox id="whatsapp" name="whatsapp" label={t("Send me booking confirmations, reminders and prescription links on WhatsApp")} hint={t("Optional. You can turn this off any time.")} />
        <Checkbox id="marketing" name="marketing" label={t("Send me health tips and offers by email")} hint={t("Optional.")} />
      </fieldset>

      <SubmitButton size="lg" className="w-full" pendingText={t("Saving…")}>
        {t("Continue")}
      </SubmitButton>
    </form>
  );
}
