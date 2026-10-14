import type { Metadata } from "next";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { Clock, IdCard, MapPin, Navigation, Phone } from "lucide-react";
import { getViewContext } from "@/server/context";
import { getAppointmentForUser } from "@/server/patient";
import { visitPassToken } from "@/lib/visit-pass";
import { env } from "@/config/env";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";

export const metadata: Metadata = { title: "Visit pass" };

/** QR visit pass for an in-clinic visit. Works offline once opened (cached by the app). */
export default async function VisitPassPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getViewContext();
  const { t, fmt } = ctx;
  const row = await getAppointmentForUser(ctx.user!, id);
  if (!row || row.a.mode !== "in_clinic") notFound();
  const a = row.a;
  const token = visitPassToken(a.id);
  const svg = await QRCode.toString(`${env.appUrl}/clinic/check-in?pass=${encodeURIComponent(token)}`, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#0b2545", light: "#ffffff" } });
  return (
    <div className="mx-auto max-w-md space-y-4">
      <div className="card overflow-hidden">
        <div className="bg-primary px-5 py-4 text-on-primary">
          <p className="text-sm font-semibold uppercase tracking-wide opacity-90">{t("Visit pass")}</p>
          <p className="text-xl font-extrabold">{row.clinicName}</p>
        </div>
        <div className="space-y-4 p-5 text-center">
          {a.status === "checked_in" ? <Badge tone="success">{t("Checked in at {time}", { time: fmt.time(a.checkedInAt!) })}</Badge> : null}
          <div className="mx-auto w-60 rounded-xl border border-line bg-white p-2" role="img" aria-label={t("QR code to show at reception")} dangerouslySetInnerHTML={{ __html: svg }} />
          <p className="text-sm text-fg-muted">{t("Or tell reception this code")}</p>
          <p className="font-mono text-3xl font-extrabold tracking-[0.3em] text-heading">{a.visitPassCode}</p>
        </div>
        <dl className="space-y-3 border-t border-line p-5 text-start">
          <div className="flex gap-3"><IdCard className="size-5 shrink-0 text-primary" aria-hidden /><div><dt className="text-sm text-fg-muted">{t("Patient")}</dt><dd className="font-semibold">{row.patientName}</dd></div></div>
          <div className="flex gap-3"><Clock className="size-5 shrink-0 text-primary" aria-hidden /><div><dt className="text-sm text-fg-muted">{t("When")}</dt><dd className="font-semibold">{fmt.dateTime(a.startAt, "Asia/Kolkata")} IST</dd><dd className="text-sm text-fg-muted">{t("Please arrive 15 minutes early.")}</dd></div></div>
          <div className="flex gap-3"><MapPin className="size-5 shrink-0 text-primary" aria-hidden /><div><dt className="text-sm text-fg-muted">{t("Where")}</dt><dd className="font-semibold">{row.doctorName}</dd><dd>{row.clinicName}, {row.clinicAddress}, {row.clinicCity}</dd></div></div>
          {a.paymentMode === "at_clinic" ? <Alert tone="info">{t("Pay {amount} at reception.", { amount: fmt.money(a.totalMinor, a.currency) })}</Alert> : <p className="text-sm text-success">{t("Paid online. Booking {ref}.", { ref: a.ref })}</p>}
        </dl>
        <div className="grid grid-cols-2 gap-2 border-t border-line p-4">
          {row.clinicLat && row.clinicLng ? (
            <a href={`https://www.google.com/maps/dir/?api=1&destination=${row.clinicLat},${row.clinicLng}`} target="_blank" rel="noopener noreferrer" className="tap inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-3 font-semibold text-on-primary"><Navigation className="size-4" aria-hidden />{t("Directions")}</a>
          ) : null}
          {row.clinicPhone ? <a href={`tel:${row.clinicPhone.replace(/\s/g, "")}`} className="tap inline-flex items-center justify-center gap-2 rounded-xl border border-field px-3 font-semibold"><Phone className="size-4" aria-hidden />{t("Call clinic")}</a> : null}
        </div>
      </div>
      <section className="card space-y-2 p-5">
        <h2 className="font-bold">{t("What to bring")}</h2>
        <ul className="list-disc space-y-1 ps-5 text-[0.9375rem]">
          <li>{t("A photo ID")}</li>
          <li>{t("Your current medicines or their strips")}</li>
          <li>{t("Old reports and scans (the clinic can also see the ones you uploaded)")}</li>
        </ul>
        <p className="text-sm text-fg-muted">{t("The clinic will see your online consult notes when you check in.")}</p>
      </section>
    </div>
  );
}
