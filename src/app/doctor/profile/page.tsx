import type { Metadata } from "next";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { getViewContext } from "@/server/context";
import { doctorForUser } from "@/server/consult";
import { getDb } from "@/db";
import { doctorFees } from "@/db/schema";
import { PageHeader } from "@/components/ui/page-header";
import { ProfileForm, FeesForm } from "@/components/doctor/profile-forms";
import { CURRENCY_CODES } from "@/config/currencies";

export const metadata: Metadata = { title: "Profile and fees" };

export default async function DoctorProfilePage() {
  const ctx = await getViewContext();
  const { t } = ctx;
  const d = (await doctorForUser(ctx.user!))!;
  const fees = await (await getDb()).select().from(doctorFees).where(eq(doctorFees.doctorId, d.id));
  return (
    <div className="max-w-3xl space-y-8">
      <PageHeader title={t("Profile and fees")} description={t("What patients see on your profile.")} actions={d.verificationStatus === "approved" ? <Link href={`/doctors/${d.slug}`} className="tap inline-flex items-center font-semibold text-primary underline">{t("View public profile")}</Link> : null} />
      <section className="card p-5"><ProfileForm p={{ ...d, hasSignature: Boolean(d.signatureDocumentId) }} /></section>
      <section className="card space-y-3 p-5" aria-labelledby="fees">
        <h2 id="fees" className="text-xl font-bold">{t("Fees per mode and currency")}</h2>
        <FeesForm fees={fees} currencies={[...CURRENCY_CODES]} />
      </section>
      <p className="text-sm text-fg-muted">{t("Qualifications and licences are changed through verification:")} <Link href="/doctor/licences" className="text-primary underline">{t("Licences")}</Link></p>
    </div>
  );
}
