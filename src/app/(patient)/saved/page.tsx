import type { Metadata } from "next";
import Link from "next/link";
import { Heart } from "lucide-react";
import { getViewContext } from "@/server/context";
import { savedDoctorList } from "@/server/patient-app";
import { PageHeader } from "@/components/ui/page-header";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { DoctorAvatar } from "@/components/ui/avatar";
import { SaveDoctorButton } from "@/components/doctor/save-doctor-button";

export const metadata: Metadata = { title: "Saved doctors" };

export default async function SavedPage() {
  const ctx = await getViewContext();
  const { t, user } = ctx;
  const rows = await savedDoctorList(user!.id);
  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title={t("Saved doctors")} description={t("Doctors you liked, so you can book them again quickly.")} />
      {rows.length ? (
        <ul className="space-y-3">
          {rows.map(({ d, specialty }) => (
            <li key={d.id} className="card flex flex-wrap items-center gap-3 p-4">
              <DoctorAvatar name={d.fullName} seed={d.avatarSeed} gender={d.gender} photoUrl={d.photoUrl} size={56} senior={d.experienceYears >= 20} />
              <div className="min-w-0 flex-1">
                <Link href={`/doctors/${d.slug}`} className="font-bold hover:underline">{d.fullName}</Link>
                <p className="text-sm text-fg-muted">{t(specialty)} · {t("{n} years experience", { n: d.experienceYears })}</p>
              </div>
              <SaveDoctorButton doctorId={d.id} saved />
              <ButtonLink href={`/book/${d.slug}`} size="sm">{t("Book")}</ButtonLink>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={<Heart className="size-8" aria-hidden />} title={t("No saved doctors")} action={<ButtonLink href="/doctors">{t("Find a doctor")}</ButtonLink>}>{t("Tap the heart on a doctor's profile to save them here.")}</EmptyState>
      )}
    </div>
  );
}
