"use client";

import { useActionState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { applyAsDoctorAction, callbackAction, complaintAction, type SupportState } from "@/server/actions/support";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/alert";

export function CallbackForm({ defaults, reason = "booking_help", languages }: { defaults: { name: string; phone: string; language: string }; reason?: string; languages: { code: string; name: string }[] }) {
  const { t } = useI18n();
  const [s, action] = useActionState(callbackAction, {} as SupportState);
  if (s.ok)
    return (
      <div className="space-y-2 text-center" role="status">
        <CheckCircle2 className="mx-auto size-12 text-success" aria-hidden />
        <p className="text-lg font-bold">{t("Thank you. We will call you back.")}</p>
        <p className="text-fg-muted">{t("Usually within 30 minutes, between 8 am and 10 pm India time.")}</p>
      </div>
    );
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      {s.error ? <Alert tone="danger" className="sm:col-span-2">{s.error}</Alert> : null}
      <Field label={t("Your name")} htmlFor="cb-n" required><Input id="cb-n" name="name" defaultValue={defaults.name} autoComplete="name" /></Field>
      <Field label={t("Phone (with country code)")} htmlFor="cb-p" required><Input id="cb-p" name="phone" type="tel" defaultValue={defaults.phone} autoComplete="tel" /></Field>
      <Field label={t("What do you need help with?")} htmlFor="cb-r" required>
        <Select id="cb-r" name="reason" defaultValue={reason}>
          <option value="booking_help">{t("Booking an online consultation")}</option>
          <option value="payment">{t("Payment or refund")}</option>
          <option value="technical">{t("A problem with the video call or website")}</option>
          <option value="international">{t("Treatment in India")}</option>
          <option value="partnership">{t("Partnering as a clinic or hospital")}</option>
          <option value="other">{t("Something else")}</option>
        </Select>
      </Field>
      <Field label={t("Language to speak in")} htmlFor="cb-l" required>
        <Select id="cb-l" name="language" defaultValue={defaults.language}>{languages.map((l) => <option key={l.code} value={l.code}>{t(l.name)}</option>)}</Select>
      </Field>
      <Field label={t("Best time to call")} htmlFor="cb-time" optional={t("optional")}><Input id="cb-time" name="preferredTime" placeholder={t("In the evening, after 6 pm")} /></Field>
      <Field label={t("Anything we should know")} htmlFor="cb-note" optional={t("optional")}><Input id="cb-note" name="note" /></Field>
      <div className="sm:col-span-2"><SubmitButton>{t("Request a call back")}</SubmitButton></div>
    </form>
  );
}

export function ComplaintForm({ defaults }: { defaults: { name: string; contact: string; appointmentRef: string } }) {
  const { t } = useI18n();
  const [s, action] = useActionState(complaintAction, {} as SupportState);
  if (s.ok)
    return (
      <div className="space-y-2" role="status">
        <Alert tone="success" title={t("Complaint {ref} received", { ref: s.ref ?? "" })}>{t("We will acknowledge it within 24 hours and resolve it within 15 days. Please keep this reference.")}</Alert>
        <Link href={`/help/complaints?ref=${s.ref}`} className="font-semibold text-primary underline">{t("Track your complaint")}</Link>
      </div>
    );
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      {s.error ? <Alert tone="danger" className="sm:col-span-2">{s.error}</Alert> : null}
      <Field label={t("Your name")} htmlFor="c-n" required><Input id="c-n" name="name" defaultValue={defaults.name} /></Field>
      <Field label={t("Phone or email")} htmlFor="c-c" required><Input id="c-c" name="contact" defaultValue={defaults.contact} /></Field>
      <Field label={t("About")} htmlFor="c-cat" required>
        <Select id="c-cat" name="category">
          <option value="consult">{t("A consultation")}</option>
          <option value="doctor">{t("A doctor's behaviour")}</option>
          <option value="payment">{t("Payment")}</option>
          <option value="refund">{t("Refund")}</option>
          <option value="privacy">{t("Privacy or my data")}</option>
          <option value="technical">{t("The website")}</option>
          <option value="other">{t("Other")}</option>
        </Select>
      </Field>
      <Field label={t("Booking reference")} htmlFor="c-ref" optional={t("optional")}><Input id="c-ref" name="appointmentRef" defaultValue={defaults.appointmentRef} placeholder="CM-XXXXXX" /></Field>
      <Field label={t("Subject")} htmlFor="c-sub" required className="sm:col-span-2"><Input id="c-sub" name="subject" /></Field>
      <Field label={t("What happened?")} htmlFor="c-d" required className="sm:col-span-2"><Textarea id="c-d" name="description" rows={5} /></Field>
      <div className="sm:col-span-2"><SubmitButton>{t("Send complaint")}</SubmitButton></div>
    </form>
  );
}

export function DoctorApplyForm({ specialties, name, specialty }: { specialties: { slug: string; name: string }[]; name: string; specialty?: string }) {
  const { t } = useI18n();
  const [s, action] = useActionState(applyAsDoctorAction, {} as SupportState);
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      {s.error ? <Alert tone="danger" className="sm:col-span-2">{s.error}</Alert> : null}
      <Field label={t("Full name as registered")} htmlFor="a-n" required className="sm:col-span-2"><Input id="a-n" name="fullName" defaultValue={name} /></Field>
      <Field label={t("Gender")} htmlFor="a-g" required><Select id="a-g" name="gender"><option value="female">{t("Female")}</option><option value="male">{t("Male")}</option><option value="other">{t("Other")}</option></Select></Field>
      <Field label={t("Main specialty")} htmlFor="a-s" required><Select id="a-s" name="specialty" defaultValue={specialty}>{specialties.map((x) => <option key={x.slug} value={x.slug}>{t(x.name)}</option>)}</Select></Field>
      <Checkbox name="agree" required className="sm:col-span-2" label={t("I agree to verification of my registration, degrees and ID, and to follow the Telemedicine Practice Guidelines, 2020.")} />
      <div className="sm:col-span-2"><SubmitButton>{t("Continue")}</SubmitButton></div>
    </form>
  );
}
