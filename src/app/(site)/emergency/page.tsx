import type { Metadata } from "next";
import { Ambulance, HeartHandshake, Phone, Siren } from "lucide-react";
import { eq } from "drizzle-orm";
import { getViewContext } from "@/server/context";
import { getCountries } from "@/server/queries/reference";
import { getDb } from "@/db";
import { clinics } from "@/db/schema";
import { RED_FLAGS } from "@/lib/triage";
import { NearestHospitals } from "@/components/emergency/nearest-hospitals";
import { Alert } from "@/components/ui/alert";
import { parseLocationParam } from "@/server/location";
import Link from "next/link";

export const metadata: Metadata = { title: "Emergency help" };

const FIRST_AID: Record<string, string> = {
  chest_pain: "Stop what you're doing and sit down. Loosen tight clothing. Don't drive yourself to hospital.",
  breathing: "Sit upright. If you have a reliever inhaler, use it as prescribed. Don't lie flat.",
  stroke: "Note the time the symptoms started — doctors need it. Don't give food or drink.",
  bleeding: "Press firmly on the wound with a clean cloth and keep pressing. Raise the injured part if you can.",
  allergy: "If you have an adrenaline auto-injector, use it now. Sit up if breathing is hard; lie down with legs raised if faint.",
  unconscious: "If they're breathing, turn them on their side. Don't put anything in their mouth during a fit.",
  pregnancy: "Lie on your left side and keep any pads to show the doctor.",
  injury: "Don't move someone with a possible neck or back injury unless they're in danger.",
  baby_fever: "Keep your baby lightly dressed and go to the nearest hospital now.",
};

export default async function EmergencyPage({ searchParams }: { searchParams: Promise<{ flags?: string; for?: string; from?: string }> }) {
  const sp = await searchParams;
  const ctx = await getViewContext();
  const { t } = ctx;
  const loc = parseLocationParam(sp.for) ?? ctx.declared ?? { country: ctx.user?.countryCode ?? "IN", region: null };
  const countries = await getCountries();
  const country = countries.find((c) => c.code === loc.country) ?? countries.find((c) => c.code === "IN")!;
  const flags = (sp.flags ?? "").split(",").filter((f) => RED_FLAGS.some((r) => r.id === f));
  const selfHarm = flags.includes("self_harm");
  const db = await getDb();
  const hospitals = (await db.select().from(clinics).where(eq(clinics.verificationStatus, "approved")))
    .filter((c) => c.lat && c.lng && c.country === country.code)
    .sort((a, b) => Number(b.emergency24x7) - Number(a.emergency24x7))
    .map((c) => ({ name: c.name, address: `${c.addressLine}, ${c.city}`, lat: c.lat!, lng: c.lng!, phone: c.phone, emergency24x7: c.emergency24x7 }));
  const em = country.emergency;

  return (
    <div className="container-page max-w-3xl space-y-6 py-8">
      <div className="rounded-2xl bg-danger-solid p-6 text-on-danger">
        <p className="flex items-center gap-2 text-lg font-semibold">
          <Siren className="size-6" aria-hidden />
          {selfHarm ? t("You don't have to face this alone") : t("This may be an emergency")}
        </p>
        <h1 className="mt-2 text-3xl font-extrabold text-on-danger">{selfHarm ? t("Please talk to someone now") : t("Get help now — don't wait for an online consult")}</h1>
        <p className="mt-2 text-on-danger">{t("Location: {place}. Numbers are free to call.", { place: country.name })}</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {selfHarm && em.crisisLine ? (
            <a href={`tel:${em.crisisLine.replace(/\s/g, "")}`} className="tap flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-xl font-extrabold text-danger">
              <HeartHandshake className="size-6" aria-hidden />
              {t("Call {number}", { number: em.crisisLine })}
            </a>
          ) : null}
          <a href={`tel:${em.general}`} className="tap flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-xl font-extrabold text-danger">
            <Phone className="size-6" aria-hidden />
            {t("Call {number}", { number: em.general })}
          </a>
          {em.ambulance && em.ambulance !== em.general ? (
            <a href={`tel:${em.ambulance}`} className="tap flex items-center justify-center gap-2 rounded-xl border-2 border-white px-5 py-3 text-lg font-bold text-on-danger">
              <Ambulance className="size-6" aria-hidden />
              {t("Ambulance {number}", { number: em.ambulance })}
            </a>
          ) : null}
        </div>
        {selfHarm && em.crisisLineName ? <p className="mt-3 text-on-danger">{em.crisisLineName}</p> : null}
      </div>

      {sp.from === "booking" ? (
        <Alert tone="info" title={t("We've stopped this booking")}>
          {t("Your answers suggest you need urgent care in person. You haven't been charged.")}
        </Alert>
      ) : null}

      {flags.length ? (
        <section className="card space-y-3 p-5" aria-labelledby="while-waiting">
          <h2 id="while-waiting" className="text-xl font-bold">{t("While you wait for help")}</h2>
          <ul className="space-y-2">
            {flags.map((f) => (
              <li key={f}>
                <strong>{t(RED_FLAGS.find((r) => r.id === f)!.label)}:</strong> {t(FIRST_AID[f] ?? "")}
              </li>
            ))}
          </ul>
          <p className="text-sm text-fg-muted">{t("Stay with the person and keep your phone on. If someone can, send them to meet the ambulance.")}</p>
        </section>
      ) : (
        <section className="card space-y-2 p-5">
          <h2 className="text-xl font-bold">{t("Call now if you or someone with you has:")}</h2>
          <ul className="list-disc space-y-1 ps-5">
            {RED_FLAGS.map((r) => (
              <li key={r.id}>{t(r.label)}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-3" aria-labelledby="nearest">
        <h2 id="nearest" className="text-xl font-bold">{t("Nearest hospitals")}</h2>
        {hospitals.length ? (
          <NearestHospitals hospitals={hospitals} />
        ) : (
          <a href="https://www.google.com/maps/search/?api=1&query=hospital+near+me" target="_blank" rel="noopener noreferrer" className="tap inline-flex items-center rounded-xl bg-primary px-4 font-semibold text-on-primary">
            {t("Find hospitals near me (maps)")}
          </a>
        )}
      </section>
      <p className="text-sm text-fg-muted">
        {t("Not an emergency?")} <Link href="/doctors" className="text-primary underline">{t("Find a doctor")}</Link> · {t("Emergency numbers are kept up to date by our team for each country.")}
      </p>
    </div>
  );
}
