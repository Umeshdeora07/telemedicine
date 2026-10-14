"use client";

import { useActionState } from "react";
import { useI18n } from "@/i18n/client";
import { saveFeesAction, saveProfileAction, type FormState } from "@/server/actions/doctor";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/alert";
import { FileUploader } from "@/components/common/file-uploader";
import { SPOKEN_LANGUAGES } from "@/config/languages";
import { COMMON_TIME_ZONES } from "@/lib/time";

type P = {
  headline: string;
  about: string;
  languages: string[];
  modes: string[];
  subSpecialties: string[];
  conditionsTreated: string[];
  procedures: string[];
  memberships: string[];
  publications: string[];
  consultMinutes: number;
  chatResponseMinutes: number;
  followUpChatDays: number;
  timeZone: string;
  acceptsInstant: boolean;
  offersSecondOpinion: boolean;
  creditOnlineFeeToClinic: boolean;
  videoIntroUrl: string | null;
  hasSignature: boolean;
};

export function ProfileForm({ p }: { p: P }) {
  const { t } = useI18n();
  const [state, action] = useActionState(saveProfileAction, {} as FormState);
  return (
    <form action={action} className="space-y-5">
      {state.ok ? <Alert tone="success">{t("Profile saved.")}</Alert> : null}
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      <Field label={t("Headline")} htmlFor="headline" required hint={t("One line patients see first, in plain words.")}>
        <Input id="headline" name="headline" defaultValue={p.headline} maxLength={140} />
      </Field>
      <Field label={t("About you (plain, patient-friendly words)")} htmlFor="about" required>
        <Textarea id="about" name="about" rows={5} defaultValue={p.about} />
      </Field>
      <fieldset>
        <legend className="mb-1 font-medium text-heading">{t("Languages you consult in")}</legend>
        <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
          {Object.entries(SPOKEN_LANGUAGES).map(([k, v]) => (
            <label key={k} className="flex min-h-11 items-center gap-2"><input type="checkbox" name="languages" value={k} defaultChecked={p.languages.includes(k)} className="size-5 accent-[var(--primary)]" />{t(v)}</label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-1 font-medium text-heading">{t("Consult modes")}</legend>
        <div className="flex flex-wrap gap-4">
          {[["video", t("Video")], ["audio", t("Audio")], ["chat", t("Chat")], ["in_clinic", t("In clinic")]].map(([k, v]) => (
            <label key={k} className="flex min-h-11 items-center gap-2"><input type="checkbox" name="modes" value={k} defaultChecked={p.modes.includes(k!)} className="size-5 accent-[var(--primary)]" />{v}</label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("Sub-specialties (comma separated)")} htmlFor="subSpecialties"><Input id="subSpecialties" name="subSpecialties" defaultValue={p.subSpecialties.join(", ")} /></Field>
        <Field label={t("Conditions you treat")} htmlFor="conditionsTreated"><Input id="conditionsTreated" name="conditionsTreated" defaultValue={p.conditionsTreated.join(", ")} /></Field>
        <Field label={t("Procedures you do")} htmlFor="procedures"><Input id="procedures" name="procedures" defaultValue={p.procedures.join(", ")} /></Field>
        <Field label={t("Memberships")} htmlFor="memberships"><Input id="memberships" name="memberships" defaultValue={p.memberships.join(", ")} /></Field>
      </div>
      <Field label={t("Publications (one per line)")} htmlFor="publications"><Textarea id="publications" name="publications" rows={2} defaultValue={p.publications.join("\n")} /></Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label={t("Consult length (minutes)")} htmlFor="consultMinutes" required><Input id="consultMinutes" name="consultMinutes" type="number" min={5} max={90} defaultValue={p.consultMinutes} /></Field>
        <Field label={t("Typical chat reply time (minutes)")} htmlFor="chatResponseMinutes" required><Input id="chatResponseMinutes" name="chatResponseMinutes" type="number" min={5} defaultValue={p.chatResponseMinutes} /></Field>
        <Field label={t("Free follow-up chat (days)")} htmlFor="followUpChatDays" required><Input id="followUpChatDays" name="followUpChatDays" type="number" min={0} max={14} defaultValue={p.followUpChatDays} /></Field>
      </div>
      <Field label={t("Time zone")} htmlFor="timeZone" required>
        <Select id="timeZone" name="timeZone" defaultValue={p.timeZone}>{Array.from(new Set([p.timeZone, ...COMMON_TIME_ZONES])).map((z) => <option key={z} value={z}>{z}</option>)}</Select>
      </Field>
      <Field label={t("Video introduction link (optional)")} htmlFor="videoIntroUrl" hint={t("A short video with captions. Upload to your own channel and paste the link.")}>
        <Input id="videoIntroUrl" name="videoIntroUrl" type="url" defaultValue={p.videoIntroUrl ?? ""} />
      </Field>
      <div className="space-y-2 rounded-xl bg-surface-2 p-4">
        <Checkbox id="acceptsInstant" name="acceptsInstant" defaultChecked={p.acceptsInstant} label={t("Take Consult now (instant) patients when I go online")} />
        <Checkbox id="offersSecondOpinion" name="offersSecondOpinion" defaultChecked={p.offersSecondOpinion} label={t("Give written second opinions (reply within 48 hours)")} />
        <Checkbox id="creditOnlineFeeToClinic" name="creditOnlineFeeToClinic" defaultChecked={p.creditOnlineFeeToClinic} label={t("Credit the online fee when I ask a patient to visit my clinic")} />
      </div>
      <div className="space-y-2">
        <p className="font-medium text-heading">{t("Signature for e-prescriptions")}</p>
        <p className="text-sm text-fg-muted">{p.hasSignature ? t("A signature image is on file. Upload a new one to replace it.") : t("Upload a clear photo of your signature on white paper (PNG or JPG).")}</p>
        <FileUploader fields={{ forDoctor: "1" }} category="signature" name="signatureDocumentId" allowCamera />
      </div>
      <SubmitButton size="lg" pendingText={t("Saving…")}>{t("Save profile")}</SubmitButton>
    </form>
  );
}

export function FeesForm({ fees, currencies }: { fees: { mode: string; currency: string; amountMinor: number }[]; currencies: string[] }) {
  const { t } = useI18n();
  const [state, action] = useActionState(saveFeesAction, {} as FormState);
  const modes = [["video", t("Video")], ["audio", t("Audio")], ["chat", t("Chat")], ["in_clinic", t("In clinic")]] as const;
  const val = (m: string, c: string) => {
    const f = fees.find((x) => x.mode === m && x.currency === c);
    return f ? String(f.amountMinor / 100) : "";
  };
  return (
    <form action={action} className="space-y-4">
      {state.ok ? <Alert tone="success">{t("Fees saved.")}</Alert> : null}
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      <p className="text-sm text-fg-muted">{t("Set fees in INR. Add a fee in another currency only for countries where you're licensed; otherwise patients see your INR fee converted.")}</p>
      <div className="overflow-x-auto">
        <table className="w-full text-start text-[0.9375rem]">
          <thead>
            <tr>
              <th scope="col" className="p-2 text-start">{t("Mode")}</th>
              {currencies.map((c) => <th key={c} scope="col" className="p-2 text-start">{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {modes.map(([m, label]) => (
              <tr key={m} className="border-t border-line">
                <th scope="row" className="p-2 text-start font-medium">{label}</th>
                {currencies.map((c) => (
                  <td key={c} className="p-1.5">
                    <Input name={`fee:${m}:${c}`} type="number" min={0} step="1" defaultValue={val(m, c)} aria-label={`${label} ${c}`} className="w-28" disabled={m === "in_clinic" && c !== "INR"} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <SubmitButton pendingText={t("Saving…")}>{t("Save fees")}</SubmitButton>
    </form>
  );
}
