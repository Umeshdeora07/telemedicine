import type { Metadata } from "next";
import { BadgeCheck, ShieldX, XCircle } from "lucide-react";
import { getViewContext } from "@/server/context";
import { verifyPrescriptionNumber } from "@/server/prescriptions";
import { humanize, maskName } from "@/lib/utils";
import { FREQUENCIES } from "@/lib/tpg";

export const metadata: Metadata = { title: "Verify a prescription", robots: { index: false } };

/** What a pharmacist sees after scanning the QR code on a digital prescription. */
export default async function VerifyRxPage({ params, searchParams }: { params: Promise<{ number: string }>; searchParams: Promise<{ s?: string }> }) {
  const { number } = await params;
  const { s } = await searchParams;
  const { t, fmt } = await getViewContext();
  const r = await verifyPrescriptionNumber(number, s ?? null);
  const ok = r.found && r.authentic && r.status === "issued";
  return (
    <div className="container-page max-w-2xl space-y-5 py-10">
      <h1 className="text-2xl font-extrabold">{t("Prescription check")}</h1>
      {!r.found ? (
        <div className="card flex items-center gap-3 border-danger p-5"><XCircle className="size-8 text-danger" aria-hidden /><p className="text-lg font-semibold">{t("No prescription with this number.")}</p></div>
      ) : (
        <>
          <div className={`card flex items-center gap-3 p-5 ${ok ? "border-success bg-success-soft" : "border-danger bg-danger-soft"}`}>
            {ok ? <BadgeCheck className="size-10 text-success" aria-hidden /> : <ShieldX className="size-10 text-danger" aria-hidden />}
            <div>
              <p className="text-xl font-bold">{ok ? t("Genuine and valid") : !r.authentic ? t("The signature does not match. Do not dispense.") : t("Cancelled by the doctor. Do not dispense.")}</p>
              <p className="text-fg-muted">{t("Prescription {n}", { n: number.toUpperCase() })} · {t("Issued {date}", { date: fmt.dateTime(r.issuedAt) })}</p>
            </div>
          </div>
          <section className="card space-y-2 p-5">
            <h2 className="font-bold">{t("Doctor")}</h2>
            <p>{[r.snapshot.doctor.name, r.snapshot.doctor.qualifications].filter(Boolean).join(", ")}</p>
            {r.snapshot.doctor.registrations.map((x) => <p key={x.number} className="text-fg-muted">{t("Reg. No.")} {x.number} · {x.issuingBody}</p>)}
            <h2 className="pt-2 font-bold">{t("Patient")}</h2>
            <p>{[maskName(r.snapshot.patient.name), r.snapshot.patient.age != null ? t("{n} years", { n: r.snapshot.patient.age }) : null, r.snapshot.patient.sex ? t(humanize(r.snapshot.patient.sex)) : null].filter(Boolean).join(" · ")}</p>
          </section>
          {r.full ? (
            <section className="card space-y-2 p-5">
              <h2 className="font-bold">{t("Medicines")}</h2>
              <ul className="space-y-1.5">
                {r.snapshot.items.map((it, i) => (
                  <li key={i}><strong>{it.name} {it.strength}</strong> ({it.form}): {it.dose}, {t(FREQUENCIES[it.frequency]?.label ?? it.frequencyLabel)}, {t("{n} days", { n: it.durationDays })}</li>
                ))}
              </ul>
              <p className="text-sm text-fg-muted">{t("Checked {n} times before.", { n: r.verifyCount })}</p>
            </section>
          ) : (
            <p className="text-fg-muted">{t("Scan the QR code on the prescription to see the medicines.")}</p>
          )}
        </>
      )}
    </div>
  );
}
