"use client";

import { useActionState } from "react";
import { useI18n } from "@/i18n/client";
import { saveFeeItemsAction, saveFeesAction, savePaymentDetailsAction, saveProfileAction, type FormState } from "@/server/actions/doctor";
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
  creditOnlineFeeToClinic: boolean;
  hasSignature: boolean;
  hasPhoto: boolean;
};

export function ProfileForm({ p }: { p: P }) {
  const { t } = useI18n();
  const [state, action] = useActionState(saveProfileAction, {} as FormState);
  return (
    <form action={action} className="space-y-5">
      {state.ok ? <Alert tone="success">{t("Profile saved.")}</Alert> : null}
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      <div className="space-y-2">
        <p className="font-medium text-heading">{t("Profile photo")}</p>
        <p className="text-sm text-fg-muted">
          {p.hasPhoto
            ? t("A photo is on file. Upload a new one to replace it.")
            : t("A clear, recent photo of you with your face visible, in professional clothes. Patients see it once you are verified.")}
        </p>
        <FileUploader fields={{ forDoctor: "1" }} category="photo" name="photoDocumentId" allowCamera />
      </div>
      <Field label={t("Headline")} htmlFor="headline" required hint={t("One line patients see first, in plain words.")}>
        <Input id="headline" name="headline" defaultValue={p.headline} maxLength={140} />
      </Field>
      <Field label={t("About you (in plain words that patients understand)")} htmlFor="about" required>
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
          {[["video", t("Video")], ["audio", t("Audio")], ["chat", t("Chat")]].map(([k, v]) => (
            <label key={k} className="flex min-h-11 items-center gap-2"><input type="checkbox" name="modes" value={k} defaultChecked={p.modes.includes(k!)} className="size-5 accent-[var(--primary)]" />{v}</label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("Areas of special interest (separate with commas)")} htmlFor="subSpecialties"><Input id="subSpecialties" name="subSpecialties" defaultValue={p.subSpecialties.join(", ")} /></Field>
        <Field label={t("Conditions you treat")} htmlFor="conditionsTreated"><Input id="conditionsTreated" name="conditionsTreated" defaultValue={p.conditionsTreated.join(", ")} /></Field>
        <Field label={t("Procedures you do")} htmlFor="procedures"><Input id="procedures" name="procedures" defaultValue={p.procedures.join(", ")} /></Field>
        <Field label={t("Memberships")} htmlFor="memberships"><Input id="memberships" name="memberships" defaultValue={p.memberships.join(", ")} /></Field>
      </div>
      <Field label={t("Publications (one per line)")} htmlFor="publications"><Textarea id="publications" name="publications" rows={2} defaultValue={p.publications.join("\n")} /></Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label={t("Consult length (minutes)")} htmlFor="consultMinutes" required><Input id="consultMinutes" name="consultMinutes" type="number" min={5} max={90} defaultValue={p.consultMinutes} /></Field>
        <Field label={t("Typical chat reply time (minutes)")} htmlFor="chatResponseMinutes" required><Input id="chatResponseMinutes" name="chatResponseMinutes" type="number" min={5} defaultValue={p.chatResponseMinutes} /></Field>
        <Field label={t("Follow up chat included (days)")} htmlFor="followUpChatDays" required><Input id="followUpChatDays" name="followUpChatDays" type="number" min={0} max={14} defaultValue={p.followUpChatDays} /></Field>
      </div>
      <Field label={t("Time zone")} htmlFor="timeZone" required>
        <Select id="timeZone" name="timeZone" defaultValue={p.timeZone}>{Array.from(new Set([p.timeZone, ...COMMON_TIME_ZONES])).map((z) => <option key={z} value={z}>{z}</option>)}</Select>
      </Field>
      <div className="space-y-2">
        <p className="font-medium text-heading">{t("Signature for digital prescriptions")}</p>
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
  const modes = [["video", t("Video")], ["audio", t("Audio")], ["chat", t("Chat")]] as const;
  const val = (m: string, c: string) => {
    const f = fees.find((x) => x.mode === m && x.currency === c);
    return f ? String(f.amountMinor / 100) : "";
  };
  return (
    <form action={action} className="space-y-4">
      {state.ok ? <Alert tone="success">{t("Fees saved.")}</Alert> : null}
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      <p className="text-sm text-fg-muted">{t("Set your fees in INR. You can also set a fixed fee in another currency. Where you don't, patients see your INR fee converted to their currency.")}</p>
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
                    <Input name={`fee:${m}:${c}`} type="number" min={0} step="1" defaultValue={val(m, c)} aria-label={`${label} ${c}`} className="w-28" />
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

type FeeItemRow = { name: string; fromMinor: number; toMinor?: number | null; note?: string };

/** Treatment and other fees: the doctor lists what they charge, patients see it on the profile. */
export function FeeItemsForm({ items }: { items: FeeItemRow[] }) {
  const { t } = useI18n();
  const [state, action] = useActionState(saveFeeItemsAction, {} as FormState);
  // The doctor's rows plus two empty ones (at least three); saving adds two more.
  const rows = [...items, ...Array.from({ length: Math.max(2, 3 - items.length) }, () => null)].slice(0, 20);
  const rupees = (m?: number | null) => (m ? String(m / 100) : "");
  return (
    <form action={action} className="space-y-4">
      {state.ok ? <Alert tone="success">{t("Fees saved.")}</Alert> : null}
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      <p className="text-sm text-fg-muted">
        {t("List your treatments and other charges in rupees, for example a procedure, a test or a follow up visit. Give one price, or a range from lowest to highest. Leave a row empty to remove it.")}
      </p>
      <div className="space-y-3">
        {rows.map((r, i) => (
          <div key={i} className="grid gap-2 rounded-xl border border-line p-3 sm:grid-cols-[2fr_1fr_1fr]">
            <Input name={`item-name-${i}`} defaultValue={r?.name ?? ""} placeholder={t("Treatment or charge, for example Knee replacement (one knee)")} aria-label={t("Treatment or charge {n}", { n: i + 1 })} maxLength={120} />
            <Input name={`item-from-${i}`} type="number" min={0} step="1" defaultValue={rupees(r?.fromMinor)} placeholder={t("Price in ₹")} aria-label={t("Price in rupees for row {n}", { n: i + 1 })} />
            <Input name={`item-to-${i}`} type="number" min={0} step="1" defaultValue={rupees(r?.toMinor)} placeholder={t("Up to ₹ (optional)")} aria-label={t("Highest price in rupees for row {n} (optional)", { n: i + 1 })} />
            <Input name={`item-note-${i}`} defaultValue={r?.note ?? ""} placeholder={t("Note (optional), for example includes 3 days in hospital")} aria-label={t("Note for row {n} (optional)", { n: i + 1 })} maxLength={200} className="sm:col-span-3" />
          </div>
        ))}
      </div>
      <SubmitButton pendingText={t("Saving…")}>{t("Save treatment fees")}</SubmitButton>
    </form>
  );
}

type PD = { upiId?: string; accountName?: string; bankName?: string; accountNumber?: string; ifsc?: string; swift?: string; notes?: string; hasQr: boolean };

/** The doctor's own UPI and bank details. Patients see them only when paying for a booking. */
export function PaymentDetailsForm({ p }: { p: PD }) {
  const { t } = useI18n();
  const [state, action] = useActionState(savePaymentDetailsAction, {} as FormState);
  return (
    <form action={action} className="space-y-5">
      {state.ok ? <Alert tone="success">{t("Payment details saved.")}</Alert> : null}
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      <p className="text-sm text-fg-muted">
        {t("Patients pay you directly. They see these details only after they choose a time with you, then send you the money and tell you the payment reference. You confirm when the money reaches you.")}
      </p>
      <fieldset className="space-y-4 rounded-xl border border-line p-4">
        <legend className="px-1 font-semibold text-heading">{t("UPI")}</legend>
        <Field label={t("UPI ID")} htmlFor="upiId" hint={t("For example yourname@okaxis")}>
          <Input id="upiId" name="upiId" defaultValue={p.upiId ?? ""} autoComplete="off" />
        </Field>
        <div className="space-y-2">
          <p className="font-medium text-heading">{t("UPI QR code")}</p>
          <p className="text-sm text-fg-muted">{p.hasQr ? t("A QR code is on file. Upload a new one to replace it.") : t("Upload the QR code from your UPI app as an image (JPG or PNG).")}</p>
          <FileUploader fields={{ forDoctor: "1", title: "UPI QR code" }} category="other" name="qrDocumentId" allowCamera={false} />
          {p.hasQr ? <Checkbox id="removeQr" name="removeQr" value="1" label={t("Remove the QR code")} /> : null}
        </div>
      </fieldset>
      <fieldset className="grid gap-4 rounded-xl border border-line p-4 sm:grid-cols-2">
        <legend className="px-1 font-semibold text-heading">{t("Bank account")}</legend>
        <Field label={t("Account holder name")} htmlFor="accountName" hint={t("As printed on your bank account")}>
          <Input id="accountName" name="accountName" defaultValue={p.accountName ?? ""} autoComplete="off" />
        </Field>
        <Field label={t("Bank name")} htmlFor="bankName">
          <Input id="bankName" name="bankName" defaultValue={p.bankName ?? ""} autoComplete="off" />
        </Field>
        <Field label={t("Account number")} htmlFor="accountNumber">
          <Input id="accountNumber" name="accountNumber" defaultValue={p.accountNumber ?? ""} inputMode="numeric" autoComplete="off" />
        </Field>
        <Field label={t("IFSC code")} htmlFor="ifsc">
          <Input id="ifsc" name="ifsc" defaultValue={p.ifsc ?? ""} autoComplete="off" />
        </Field>
        <Field label={t("SWIFT code (for patients paying from abroad)")} htmlFor="swift" hint={t("Ask your bank for it. Leave empty if you do not accept international transfers.")} className="sm:col-span-2">
          <Input id="swift" name="swift" defaultValue={p.swift ?? ""} autoComplete="off" />
        </Field>
      </fieldset>
      <Field label={t("Other payment instructions (optional)")} htmlFor="notes" hint={t("For example another way patients from abroad can pay you.")}>
        <Textarea id="notes" name="notes" rows={2} defaultValue={p.notes ?? ""} maxLength={400} />
      </Field>
      <SubmitButton pendingText={t("Saving…")}>{t("Save payment details")}</SubmitButton>
    </form>
  );
}
