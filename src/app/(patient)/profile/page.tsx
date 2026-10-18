import type { Metadata } from "next";
import Link from "next/link";
import { Bell, CalendarCheck, ChevronRight, FolderHeart, LifeBuoy, Plane, Receipt, Settings, Users } from "lucide-react";
import { getViewContext } from "@/server/context";
import { myPeople } from "@/server/patient";
import { SPOKEN_LANGUAGES } from "@/config/languages";
import { PageHeader } from "@/components/ui/page-header";
import { LinkTabs } from "@/components/ui/tabs";
import { InitialsAvatar } from "@/components/ui/avatar";
import { HealthProfileForm } from "@/components/patient/settings-forms";
import { maskPhone } from "@/lib/utils";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const ctx = await getViewContext();
  const { t, user } = ctx;
  const people = (await myPeople(user!.id)).filter((x) => !x.link || (x.link.status === "active" && x.link.canBook));
  const { p } = await searchParams;
  const cur = people.find((x) => x.patient.id === p) ?? people[0];
  const links = [
    { href: "/consults", label: t("My consultations"), Icon: CalendarCheck },
    { href: "/international/cases", label: t("My treatment plans"), Icon: Plane },
    { href: "/records", label: t("Records and prescriptions"), Icon: FolderHeart },
    { href: "/invoices", label: t("Payments"), Icon: Receipt },
    { href: "/family", label: t("Family members"), Icon: Users },
    { href: "/notifications", label: t("Notifications"), Icon: Bell },
    { href: "/settings", label: t("Settings"), Icon: Settings },
    { href: "/help", label: t("Help and support"), Icon: LifeBuoy },
  ];
  return (
    <div className="space-y-6">
      <div className="card flex flex-wrap items-center gap-4 p-5">
        <InitialsAvatar name={user!.name || "?"} size={56} />
        <div>
          <h1 className="text-2xl font-extrabold text-heading">{user!.name}</h1>
          <p className="text-fg-muted">{[maskPhone(user!.phone), user!.email].filter(Boolean).join(" · ")}</p>
        </div>
        <form action="/api/auth/logout" method="post" className="ms-auto">
          <button type="submit" className="tap rounded-xl px-4 font-semibold text-danger hover:bg-danger-soft">{t("Log out")}</button>
        </form>
      </div>
      <nav aria-label={t("Your account")}>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {links.map(({ href, label, Icon }) => (
            <li key={href}>
              <Link href={href} className="card flex min-h-14 items-center gap-3 px-4 hover:border-primary">
                <Icon className="size-5 text-primary" aria-hidden />
                <span className="flex-1 font-medium">{label}</span>
                <ChevronRight className="size-4 text-fg-muted rtl:rotate-180" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {cur ? (
        <section className="space-y-3" aria-labelledby="health">
          <PageHeader title={t("Health details")} description={t("Your doctor sees these before each consultation. Keep allergies and medicines up to date.")} />
          {people.length > 1 ? <LinkTabs label={t("Whose details")} current={cur.patient.id} tabs={people.map((x) => ({ key: x.patient.id, href: `/profile?p=${x.patient.id}`, label: x.link ? x.patient.fullName.split(" ")[0]! : t("Me") }))} /> : null}
          <div className="card p-5" id="health">
            <HealthProfileForm
              key={cur.patient.id}
              p={{ patientId: cur.patient.id, bloodGroup: cur.patient.bloodGroup, heightCm: cur.patient.heightCm, weightKg: cur.patient.weightKg, allergies: cur.patient.allergies, conditions: cur.patient.conditions, currentMedicines: cur.patient.currentMedicines, emergencyContact: cur.patient.emergencyContact, preferredLanguage: cur.patient.preferredLanguage, city: cur.patient.city }}
              languages={Object.entries(SPOKEN_LANGUAGES).map(([code, name]) => ({ code, name }))}
            />
          </div>
        </section>
      ) : null}
    </div>
  );
}
