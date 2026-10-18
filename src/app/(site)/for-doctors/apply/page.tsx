import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/server/auth/session";
import { getI18n } from "@/i18n/server";
import { getSpecialties } from "@/server/queries/reference";
import { PageHeader } from "@/components/ui/page-header";
import { Alert } from "@/components/ui/alert";
import { DoctorApplyForm } from "@/components/support/support-forms";
import { JoinRequirements } from "@/components/doctor/join-requirements";

export const metadata: Metadata = { title: "Apply as a doctor", robots: { index: false } };

/**
 * Joining as a doctor. An admin can send a link with the doctor's name and
 * specialty filled in: /for-doctors/apply?name=...&specialty=dermatology.
 */
export default async function ApplyAsDoctor({ searchParams }: { searchParams: Promise<{ name?: string; specialty?: string }> }) {
  const sp = await searchParams;
  const name = typeof sp.name === "string" ? sp.name.slice(0, 100) : "";
  const specialty = typeof sp.specialty === "string" ? sp.specialty.slice(0, 60) : "";
  const session = await getSession();
  if (!session) {
    const query = new URLSearchParams({ ...(name ? { name } : {}), ...(specialty ? { specialty } : {}) }).toString();
    redirect(`/login?next=${encodeURIComponent(`/for-doctors/apply${query ? `?${query}` : ""}`)}`);
  }
  if (session.user.role === "doctor") redirect("/doctor/onboarding");
  const { t } = await getI18n();
  if (session.user.role !== "patient") {
    return (
      <div className="container-page max-w-xl space-y-6 py-8">
        <PageHeader title={t("Apply as a doctor")} />
        <Alert tone="info" title={t("You are logged in with a staff account")}>
          {t("A doctor needs their own account. To see what the doctor sees, open this link in a private window or on another phone, or log out first.")}
        </Alert>
      </div>
    );
  }
  const specs = await getSpecialties();
  return (
    <div className="container-page max-w-xl space-y-6 py-8">
      <PageHeader title={t("Apply as a doctor")} description={t("Next you will set up two step verification with an app on your phone. Then you fill in your details and upload your documents. Our team checks them before your profile goes live.")} />
      <div className="card p-5">
        <DoctorApplyForm specialties={specs.map((s) => ({ slug: s.slug, name: s.name }))} name={session.user.name || name} specialty={specs.some((s) => s.slug === specialty) ? specialty : undefined} />
      </div>
      <section className="card space-y-3 p-5" aria-labelledby="ready">
        <h2 id="ready" className="text-lg font-bold">{t("Keep these ready")}</h2>
        <JoinRequirements t={t} />
      </section>
    </div>
  );
}
