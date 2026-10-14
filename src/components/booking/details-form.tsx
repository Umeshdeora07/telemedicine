"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Siren, UserPlus } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { createBookingAction, type BookingFormState } from "@/server/actions/booking";
import { Checkbox, RadioCard, Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { RED_FLAGS } from "@/lib/triage";
import { SPOKEN_LANGUAGES } from "@/config/languages";
import type { LocOption } from "@/components/location/location-picker";

type P = { id: string; name: string; relationship: string; age: number | null; status: string; canBook: boolean; country: string };

export function DetailsForm({
  doctorSlug,
  mode,
  slotId,
  from,
  type,
  people,
  options,
  defaultLocation,
  addFamilyHref,
}: {
  doctorSlug: string;
  mode: string;
  slotId: string;
  from?: string;
  type?: string;
  people: P[];
  options: LocOption[];
  defaultLocation: { country: string; region: string | null };
  addFamilyHref: string;
}) {
  const { t } = useI18n();
  const [state, action] = useActionState(createBookingAction, {} as BookingFormState);
  const firstBookable = people.find((p) => p.canBook);
  const [patientId, setPatientId] = useState(firstBookable?.id ?? "");
  const patient = people.find((p) => p.id === patientId);
  const [country, setCountry] = useState(defaultLocation.country);
  const [region, setRegion] = useState(defaultLocation.region ?? "");
  const [flags, setFlags] = useState<string[]>([]);
  const opt = options.find((o) => o.code === country);
  const isCaregiver = patient && patient.relationship !== "self";

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="doctorSlug" value={doctorSlug} />
      <input type="hidden" name="mode" value={mode} />
      <input type="hidden" name="slotId" value={slotId} />
      <input type="hidden" name="from" value={from ?? ""} />
      <input type="hidden" name="type" value={type ?? ""} />
      {state.error ? <Alert tone="danger">{state.error}{state.code === "slot_taken" ? <> <Link className="font-semibold underline" href={`/book/${doctorSlug}?mode=${mode}`}>{t("Pick another time")}</Link></> : null}</Alert> : null}

      <fieldset className="space-y-2">
        <legend className="text-lg font-bold text-heading">{t("Who is the consult for?")}</legend>
        <div className="grid gap-2">
          {people.map((p) => (
            <RadioCard key={p.id} name="patientId" value={p.id} checked={patientId === p.id} onChange={setPatientId} disabled={!p.canBook}>
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-soft font-bold text-primary-soft-fg" aria-hidden>
                {p.name[0]}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">
                  {p.name} {p.relationship === "self" ? <span className="font-normal text-fg-muted">({t("you")})</span> : null}
                </span>
                <span className="text-sm text-fg-muted">
                  {p.relationship !== "self" ? t(p.relationship) : ""}
                  {p.age !== null ? ` · ${t("{n} years", { n: p.age })}` : ""}
                </span>
              </span>
              {p.status === "pending_consent" ? <Badge tone="warning">{t("Waiting for their consent")}</Badge> : null}
            </RadioCard>
          ))}
        </div>
        <Link href={addFamilyHref} className="tap inline-flex items-center gap-2 font-semibold text-primary">
          <UserPlus className="size-5" aria-hidden />
          {t("Add a family member")}
        </Link>
      </fieldset>

      {patient && patient.age !== null && patient.age < 18 ? (
        <Alert tone="info">{t("A parent or guardian must be with {name} for the whole consult.", { name: patient.name })}</Alert>
      ) : null}

      {mode !== "in_clinic" ? (
        <fieldset className="space-y-2">
          <legend className="text-lg font-bold text-heading">{t("Where will {name} be during the consult?", { name: patient?.relationship === "self" ? t("you") : (patient?.name ?? t("the patient")) })}</legend>
          <p className="text-sm text-fg-muted">{t("The patient's location decides which rules apply and which doctors may treat them. Family members can join from anywhere.")}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label htmlFor="country" className="text-sm font-medium">{t("Country")}</label>
              <Select id="country" name="country" value={country} onChange={(e) => { setCountry(e.target.value); setRegion(""); }}>
                {options.map((o) => (
                  <option key={o.code} value={o.code}>{o.name}</option>
                ))}
              </Select>
            </div>
            {opt?.scope === "region" ? (
              <div className="space-y-1">
                <label htmlFor="region" className="text-sm font-medium">{t("State / province")}</label>
                <Select id="region" name="region" value={region} onChange={(e) => setRegion(e.target.value)} required>
                  <option value="">{t("Choose")}</option>
                  {opt.regions.map((r) => (
                    <option key={r.code} value={r.code}>{r.name}</option>
                  ))}
                </Select>
              </div>
            ) : null}
          </div>
        </fieldset>
      ) : (
        <input type="hidden" name="country" value="IN" />
      )}

      <fieldset className="space-y-2 rounded-xl border border-danger/30 p-4">
        <legend className="flex items-center gap-2 px-1 text-lg font-bold text-heading">
          <Siren className="size-5 text-danger" aria-hidden />
          {t("Quick safety check")}
        </legend>
        <p className="text-[0.9375rem]">{t("Is the patient having any of these right now? If so, they need emergency care, not an online consult.")}</p>
        <div className="grid gap-1.5">
          {RED_FLAGS.slice(0, 8).map((f) => (
            <label key={f.id} className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg p-1.5 hover:bg-surface-2">
              <input
                type="checkbox"
                name="redFlags"
                value={f.id}
                checked={flags.includes(f.id)}
                onChange={(e) => setFlags(e.target.checked ? [...flags, f.id] : flags.filter((x) => x !== f.id))}
                className="mt-0.5 size-6 shrink-0 accent-[var(--danger-solid)]"
              />
              <span>{t(f.label)}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <details className="rounded-xl border border-line p-4">
        <summary className="tap cursor-pointer list-none font-semibold text-primary">{t("Need a medical interpreter? (optional)")}</summary>
        <div className="mt-3 space-y-1">
          <label htmlFor="interpreter" className="text-sm font-medium">{t("Interpreter language")}</label>
          <Select id="interpreter" name="interpreter" defaultValue="">
            <option value="">{t("No interpreter needed")}</option>
            {Object.entries(SPOKEN_LANGUAGES).map(([k, v]) => (
              <option key={k} value={k}>{t(v)}</option>
            ))}
          </Select>
          <p className="text-sm text-fg-muted">{t("A care coordinator will add a certified medical interpreter to the call.")}</p>
        </div>
      </details>

      {isCaregiver ? (
        <Checkbox
          id="caregiverConsent"
          name="caregiverConsent"
          required
          label={t("{name} knows about this consult and agrees to it.", { name: patient!.name })}
          hint={t("Required by India's telemedicine rules when a family member books on someone's behalf. The doctor will also confirm at the start.")}
        />
      ) : null}

      {flags.length ? (
        <SubmitButton variant="danger" size="lg" className="w-full">
          <Siren className="size-5" aria-hidden />
          {t("Get emergency help")}
        </SubmitButton>
      ) : (
        <SubmitButton size="lg" className="w-full" disabled={!patientId} pendingText={t("Holding your slot…")}>
          {t("Continue to payment")}
        </SubmitButton>
      )}
    </form>
  );
}
