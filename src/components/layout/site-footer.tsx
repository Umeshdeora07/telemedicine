import Link from "next/link";
import { Lock, ShieldCheck, Undo2 } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { brand } from "@/config/brand";
import { getI18n } from "@/i18n/server";

export async function SiteFooter() {
  const { t } = await getI18n();
  const cols = [
    {
      title: t("Patients"),
      links: [
        ["/doctors", t("Find a doctor")],
        ["/consult-now", t("Consult now")],
        ["/triage", t("Check your symptoms")],
        ["/second-opinion", t("Second opinion")],
        ["/pricing", t("Pricing and plans")],
        ["/international", t("International patients")],
        ["/health-library", t("Health library")],
      ],
    },
    {
      title: t("Partners"),
      links: [
        ["/for-doctors", t("For doctors (join us)")],
        ["/for-clinics", t("For clinics and hospitals")],
        ["/hospitals", t("Hospitals and clinics")],
      ],
    },
    {
      title: t("Company"),
      links: [
        ["/about", t("About us")],
        ["/how-it-works", t("How it works")],
        ["/contact", t("Contact")],
        ["/help", t("Help centre")],
        ["/legal/grievance", t("Grievance officer")],
      ],
    },
    {
      title: t("Legal"),
      links: [
        ["/legal/terms", t("Terms of use")],
        ["/legal/privacy", t("Privacy policy")],
        ["/legal/telemedicine-consent", t("Telemedicine consent")],
        ["/legal/refunds", t("Refund and cancellation")],
        ["/legal/cookies", t("Cookie policy")],
        ["/legal/medical-disclaimer", t("Medical disclaimer")],
      ],
    },
  ];
  return (
    <footer className="mt-16 bg-navy pb-24 text-on-navy md:pb-10">
      <div className="container-page grid gap-10 py-12 md:grid-cols-[1.3fr_repeat(4,1fr)]">
        <div className="space-y-4">
          <Logo light />
          <p className="max-w-xs text-navy-muted">{t("Trusted doctors, online and in clinic. For you, your family in India, and patients from around the world.")}</p>
          <ul className="space-y-2 text-sm text-navy-muted">
            <li className="flex items-center gap-2"><ShieldCheck className="size-4 text-accent" aria-hidden />{t("Every doctor's licence verified")}</li>
            <li className="flex items-center gap-2"><Lock className="size-4 text-accent" aria-hidden />{t("Encrypted calls and records")}</li>
            <li className="flex items-center gap-2"><Undo2 className="size-4 text-accent" aria-hidden />{t("Full refund if the doctor doesn't join")}</li>
          </ul>
        </div>
        {cols.map((c) => (
          <nav key={c.title} aria-label={c.title}>
            <h2 className="mb-3 font-semibold text-on-navy">{c.title}</h2>
            <ul className="space-y-1">
              {c.links.map(([href, label]) => (
                <li key={href}>
                  <Link href={href!} className="inline-flex min-h-9 items-center text-navy-muted hover:text-on-navy hover:underline">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-2 py-6 text-sm text-navy-muted sm:flex-row sm:justify-between">
          <p>
            © {new Date().getFullYear()} {brand.legalEntity}. {t("Not for emergencies: call 112 in India.")}
          </p>
          <p>
            {t("Grievance officer")}: {brand.grievanceOfficer.name} · <a className="underline" href={`mailto:${brand.grievanceOfficer.email}`}>{brand.grievanceOfficer.email}</a>
          </p>
        </div>
      </div>
    </footer>
  );
}
