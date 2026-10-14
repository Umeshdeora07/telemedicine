"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { MessageSquare, Phone, Siren, Video } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { startInstantConsult, type InstantState } from "@/server/actions/instant";
import { Checkbox, RadioCard, Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/alert";
import { RED_FLAGS } from "@/lib/triage";
import { SPOKEN_LANGUAGES } from "@/config/languages";
import type { LocOption } from "@/components/location/location-picker";

type P = { id: string; name: string; relationship: string; canBook: boolean };

export function InstantForm({ specialties, defaultSpecialty, people, options, defaultLocation, defaultLanguage }: { specialties: { slug: string; name: string }[]; defaultSpecialty: string; people: P[]; options: LocOption[]; defaultLocation: { country: string; region: string | null }; defaultLanguage: string }) {
  const { t } = useI18n();
  const [state, action] = useActionState(startInstantConsult, {} as InstantState);
  const [patientId, setPatientId] = useState(people.find((p) => p.canBook)?.id ?? "");
  const [country, setCountry] = useState(defaultLocation.country);
  const [region, setRegion] = useState(defaultLocation.region ?? "");
  const [mode, setMode] = useState("video");
  const [flags, setFlags] = useState<string[]>([]);
  const opt = options.find((o) => o.code === country);
  const patient = people.find((p) => p.id === patientId);
  return (
    <form action={action} className="space-y-6">
      {state.error ? (
        <Alert tone="warning" title={state.error}>
          {state.none ? (
            <>
              <Link href="/doctors" className="font-semibold text-primary underline">{t("See the next available slots")}</Link> · <Link href="/help/callback" className="font-semibold text-primary underline">{t("Ask us to call you")}</Link>
            </>
          ) : null}
        </Alert>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="specialty" className="font-medium text-heading">{t("Type of doctor")}</label>
          <Select id="specialty" name="specialty" defaultValue={defaultSpecialty}>
            {specialties.map((s) => <option key={s.slug} value={s.slug}>{t(s.name)}</option>)}
          </Select>
          <p className="text-sm text-fg-muted"><Link href="/triage" className="text-primary underline">{t("Not sure? Check your symptoms")}</Link></p>
        </div>
        <fieldset>
          <legend className="mb-1 font-medium text-heading">{t("How")}</legend>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                ["video", t("Video"), Video],
                ["audio", t("Audio"), Phone],
                ["chat", t("Chat"), MessageSquare],
              ] as const
            ).map(([m, label, Icon]) => (
              <RadioCard key={m} name="mode" value={m} checked={mode === m} onChange={setMode} className="flex-col justify-center p-2 text-center">
                <Icon className="size-5 text-primary" aria-hidden />
                <span className="text-sm font-semibold">{label}</span>
              </RadioCard>
            ))}
          </div>
        </fieldset>
      </div>

      <fieldset className="space-y-2">
        <legend className="font-medium text-heading">{t("Who is it for?")}</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {people.map((p) => (
            <RadioCard key={p.id} name="patientId" value={p.id} checked={patientId === p.id} onChange={setPatientId} disabled={!p.canBook}>
              <span className="font-semibold">{p.name}</span>
              <span className="text-sm text-fg-muted">{p.relationship === "self" ? t("you") : t(p.relationship)}</span>
            </RadioCard>
          ))}
        </div>
        <Link href="/family/new?next=/consult-now" className="text-sm font-semibold text-primary underline">{t("Add a family member")}</Link>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="ic" className="font-medium text-heading">{t("Where is the patient right now?")}</label>
          <Select id="ic" name="country" value={country} onChange={(e) => { setCountry(e.target.value); setRegion(""); }}>
            {options.map((o) => <option key={o.code} value={o.code}>{o.name}</option>)}
          </Select>
        </div>
        {opt?.scope === "region" ? (
          <div className="space-y-1">
            <label htmlFor="ir" className="font-medium text-heading">{t("State / province")}</label>
            <Select id="ir" name="region" value={region} onChange={(e) => setRegion(e.target.value)}>
              <option value="">{t("Choose")}</option>
              {opt.regions.map((r) => <option key={r.code} value={r.code}>{r.name}</option>)}
            </Select>
          </div>
        ) : null}
      </div>

      <details className="rounded-xl border border-line p-4">
        <summary className="tap cursor-pointer list-none font-semibold text-primary">{t("Preferences (language, woman or man doctor)")}</summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label htmlFor="lang" className="text-sm font-medium">{t("Doctor speaks")}</label>
            <Select id="lang" name="language" defaultValue={defaultLanguage}>
              <option value="">{t("Any language")}</option>
              {Object.entries(SPOKEN_LANGUAGES).map(([k, v]) => <option key={k} value={k}>{t(v)}</option>)}
            </Select>
          </div>
          <div className="space-y-1">
            <label htmlFor="gender" className="text-sm font-medium">{t("Doctor")}</label>
            <Select id="gender" name="gender" defaultValue="">
              <option value="">{t("Woman or man")}</option>
              <option value="female">{t("Woman doctor")}</option>
              <option value="male">{t("Man doctor")}</option>
            </Select>
          </div>
        </div>
      </details>

      <fieldset className="space-y-2 rounded-xl border border-danger/30 p-4">
        <legend className="flex items-center gap-2 px-1 font-bold text-heading"><Siren className="size-5 text-danger" aria-hidden />{t("Quick safety check")}</legend>
        <p className="text-[0.9375rem]">{t("Is the patient having any of these right now?")}</p>
        {RED_FLAGS.slice(0, 8).map((f) => (
          <label key={f.id} className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg p-1.5">
            <input type="checkbox" name="redFlags" value={f.id} checked={flags.includes(f.id)} onChange={(e) => setFlags(e.target.checked ? [...flags, f.id] : flags.filter((x) => x !== f.id))} className="mt-0.5 size-6 shrink-0 accent-[var(--danger-solid)]" />
            <span>{t(f.label)}</span>
          </label>
        ))}
      </fieldset>

      {patient && patient.relationship !== "self" ? (
        <Checkbox id="cgc" name="caregiverConsent" required label={t("{name} knows about this consult and agrees to it.", { name: patient.name })} />
      ) : null}

      {flags.length ? (
        <SubmitButton variant="danger" size="lg" className="w-full"><Siren className="size-5" aria-hidden />{t("Get emergency help")}</SubmitButton>
      ) : (
        <SubmitButton size="lg" className="w-full" pendingText={t("Finding a doctor…")} disabled={!patientId}>
          {t("Find a doctor now")}
        </SubmitButton>
      )}
    </form>
  );
}
