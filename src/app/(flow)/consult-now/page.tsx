import type { Metadata } from "next";
import { Video } from "lucide-react";
import { getViewContext } from "@/server/context";
import { requireUser } from "@/server/auth/session";
import { getSpecialties } from "@/server/queries/reference";
import { locationOptions, resolveLocation } from "@/server/location";
import { bookablePatients } from "@/server/booking";
import { getDb } from "@/db";
import { InstantForm } from "@/components/booking/instant-form";

export const metadata: Metadata = { title: "Consult now" };

export default async function ConsultNowPage({ searchParams }: { searchParams: Promise<{ specialty?: string; for?: string }> }) {
  const sp = await searchParams;
  const user = await requireUser();
  const ctx = await getViewContext();
  const { t } = ctx;
  const [specs, options, people] = await Promise.all([getSpecialties(), locationOptions(), bookablePatients(await getDb(), user.id)]);
  const loc = resolveLocation(sp.for, ctx.declared, user);
  return (
    <div className="space-y-6">
      <div>
        <p className="flex items-center gap-2 font-semibold text-primary"><Video className="size-5" aria-hidden />{t("Consult now")}</p>
        <h1 className="text-2xl font-extrabold sm:text-3xl">{t("Talk to a verified doctor in minutes")}</h1>
        <p className="text-fg-muted">{t("We'll match you with the first available doctor licensed for the patient's location. You'll see the doctor and the price before you pay.")}</p>
      </div>
      <div className="card p-5 sm:p-6">
        <InstantForm
          specialties={specs.map((s) => ({ slug: s.slug, name: s.name }))}
          defaultSpecialty={sp.specialty && specs.some((s) => s.slug === sp.specialty) ? sp.specialty : "general-physician"}
          people={people.map((p) => ({ id: p.patient.id, name: p.patient.fullName, relationship: p.relationship, canBook: p.canBook }))}
          options={options}
          defaultLocation={loc}
          defaultLanguage={ctx.locale === "hi" ? "hi" : ""}
        />
      </div>
    </div>
  );
}
