import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { clinics } from "@/db/schema";
import { getViewContext } from "@/server/context";
import { myPeople } from "@/server/patient";
import { getCountries, getSpecialties } from "@/server/queries/reference";
import { CURRENCY_CODES } from "@/config/currencies";
import { SPOKEN_LANGUAGES } from "@/config/languages";
import { PageHeader } from "@/components/ui/page-header";
import { EnquiryForm } from "@/components/cases/enquiry-form";

export const metadata: Metadata = { title: "Get a treatment plan" };

export default async function NewEnquiry() {
  const ctx = await getViewContext();
  const { t, user, currency, locale } = ctx;
  const [people, countries, specs, hospitals] = await Promise.all([myPeople(user!.id), getCountries(), getSpecialties(), (await getDb()).select().from(clinics).where(eq(clinics.acceptsInternational, true))]);
  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title={t("Get a treatment plan in India")} description={t("Send your reports. A specialist reviews them and usually replies within 2 working days with a written treatment plan and a cost estimate in your currency. There is no obligation.")} />
      <div className="card p-5">
        <EnquiryForm
          people={people.filter((p) => !p.link || (p.link.status === "active" && p.link.canBook)).map((p) => ({ id: p.patient.id, name: p.patient.fullName }))}
          countries={countries.filter((c) => c.code !== "IN").map((c) => ({ code: c.code, name: c.name }))}
          specialties={specs.map((s) => ({ id: s.id, name: s.name }))}
          clinics={hospitals.map((h) => ({ id: h.id, name: h.name, city: h.city }))}
          currencies={[...CURRENCY_CODES]}
          defaults={{ country: user!.countryCode === "IN" ? (countries.find((c) => c.code !== "IN")?.code ?? "BD") : user!.countryCode, currency, language: locale === "en" ? "en" : locale }}
          languages={Object.entries(SPOKEN_LANGUAGES).map(([code, name]) => ({ code, name }))}
        />
      </div>
    </div>
  );
}
