"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { ShieldAlert, UserPlus } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { createBookingAction, type BookingFormState } from "@/server/actions/booking";
import { Checkbox, RadioCard, Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { RED_FLAGS } from "@/lib/triage";
import { SPOKEN_LANGUAGES } from "@/config/languages";

type P = { id: string; name: string; relationship: string; age: number | null; status: string; canBook: boolean };

export function DetailsForm({
  doctorSlug,
  mode,
  slotId,
  from,
  type,
  people,
  addFamilyHref,
}: {
  doctorSlug: string;
  mode: string;
  slotId: string;
  from?: string;
  type?: string;
  people: P[];
  addFamilyHref: string;
}) {
  const { t } = useI18n();
  const [state, action] = useActionState(createBookingAction, {} as BookingFormState);
  const firstBookable = people.find((p) => p.canBook);
  const [patientId, setPatientId] = useState(firstBookable?.id ?? "");
  const patient = people.find((p) => p.id === patientId);
  // The safety answers stay in the browser: if any is ticked, we ask the
  // patient to get urgent care instead of booking.
  const [flags, setFlags] = useState<string[]>([]);
  const isCaregiver = patient && patient.relationship !== "self";

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="doctorSlug" value={doctorSlug} />
      <input type="hidden" name="mode" value={mode} />
      <input type="hidden" name="slotId" value={slotId} />
      <input type="hidden" name="from" value={from ?? ""} />
      <input type="hidden" name="type" value={type ?? ""} />
      {state.error ? (
        <Alert tone="danger">
          {state.error}
          {state.code === "slot_taken" ? (
            <>
              {" "}
              <Link className="font-semibold underline" href={`/book/${doctorSlug}?mode=${mode}`}>
                {t("Choose another time")}
              </Link>
            </>
          ) : null}
        </Alert>
      ) : null}

      <fieldset className="space-y-2">
        <legend className="text-lg font-bold text-heading">{t("Who is the consultation for?")}</legend>
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
                  {[p.relationship !== "self" ? t(p.relationship) : "", p.age !== null ? t("{n} years", { n: p.age }) : ""].filter(Boolean).join(", ")}
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
        <Alert tone="info">{t("A parent or guardian must be with {name} for the whole consultation.", { name: patient.name })}</Alert>
      ) : null}

      <fieldset className="space-y-2 rounded-xl border border-line bg-surface p-4">
        <legend className="flex items-center gap-2 px-1 text-lg font-bold text-heading">
          <ShieldAlert className="size-5 text-danger" aria-hidden />
          {t("Quick safety check")}
        </legend>
        <p className="text-[0.9375rem]">{t("Does the patient have any of these right now? Tick any that apply.")}</p>
        <div className="grid gap-1.5">
          {RED_FLAGS.slice(0, 8).map((f) => (
            <label key={f.id} className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg p-1.5 hover:bg-surface-2">
              <input
                type="checkbox"
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

      {flags.length ? (
        <Alert tone="danger" title={t("Please get urgent care now")}>
          {t("An online consultation is not safe for this. Go to the nearest hospital or call your local emergency number now.")}
          {flags.includes("self_harm") ? ` ${t("If you are thinking about harming yourself, please also tell someone you trust now.")}` : ""}
        </Alert>
      ) : null}

      <details className="rounded-xl border border-line p-4">
        <summary className="tap flex cursor-pointer list-none items-center font-semibold text-primary">{t("Do you need an interpreter? (optional)")}</summary>
        <div className="mt-3 space-y-1">
          <label htmlFor="interpreter" className="text-sm font-medium">
            {t("Interpreter language")}
          </label>
          <Select id="interpreter" name="interpreter" defaultValue="">
            <option value="">{t("No interpreter needed")}</option>
            {Object.entries(SPOKEN_LANGUAGES).map(([k, v]) => (
              <option key={k} value={k}>
                {t(v)}
              </option>
            ))}
          </Select>
          <p className="text-sm text-fg-muted">{t("Our care team will arrange a medical interpreter to join the call.")}</p>
        </div>
      </details>

      {isCaregiver ? (
        <Checkbox
          id="caregiverConsent"
          name="caregiverConsent"
          required
          label={t("{name} knows about this consultation and agrees to it.", { name: patient!.name })}
          hint={t("India's telemedicine rules ask for this when a family member books for someone else. The doctor will also confirm it at the start.")}
        />
      ) : null}

      {/* Pass disabled only when needed: SubmitButton lets an explicit value override its own pending state. */}
      <SubmitButton size="lg" className="w-full" pendingText={t("Holding your time…")} {...(!patientId || flags.length ? { disabled: true } : {})}>
        {t("Continue to payment")}
      </SubmitButton>
    </form>
  );
}
