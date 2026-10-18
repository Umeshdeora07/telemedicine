import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/server/auth/session";
import { getI18n } from "@/i18n/server";
import { getSpecialties } from "@/server/queries/reference";
import { PageHeader } from "@/components/ui/page-header";
import { DoctorApplyForm } from "@/components/support/support-forms";

export const metadata: Metadata = { title: "Apply as a doctor", robots: { index: false } };

export default async function ApplyAsDoctor() {
  const session = await getSession();
  if (!session) redirect("/login?next=/for-doctors/apply");
  if (session.user.role === "doctor") redirect("/doctor/onboarding");
  const { t } = await getI18n();
  const specs = await getSpecialties();
  return (
    <div className="container-page max-w-xl space-y-6 py-8">
      <PageHeader title={t("Apply as a doctor")} description={t("Next you will set up two step verification with an app on your phone. Then you fill in your details and upload your documents. Our team checks them before your profile goes live.")} />
      <div className="card p-5"><DoctorApplyForm specialties={specs.map((s) => ({ slug: s.slug, name: s.name }))} name={session.user.name} /></div>
    </div>
  );
}
