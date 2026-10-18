import Link from "next/link";
import { Lock, Mail, MessageCircle, Phone, ShieldCheck, Undo2 } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { brand } from "@/config/brand";
import { getI18n } from "@/i18n/server";
import { getSession } from "@/server/auth/session";
import { getViewerRegion } from "@/lib/prefs";
import { CurrencySelect } from "./currency-select";

/** Values in src/config/brand.ts that are still the shipped placeholders are not shown. */
function isSet(value: string | null | undefined): value is string {
  if (!value) return false;
  return !/placeholder|to be (added|appointed)|\.example\b|80000 0000\d/i.test(value);
}

function telHref(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

export async function SiteFooter() {
  const { t } = await getI18n();
  const session = await getSession();
  const { currency } = await getViewerRegion(session?.user ?? null);

  const cols: { title: string; links: [string, string][] }[] = [
    {
      title: t("For patients"),
      links: [
        ["/online-consultation", t("Online consultation")],
        ["/treatment-in-india", t("Treatment in India")],
        ["/doctors", t("Our doctors")],
        ["/help", t("Help centre")],
        ["/help/callback", t("Request a call back")],
      ],
    },
    {
      title: t("Specialties"),
      links: [
        ["/specialties/orthopaedics", t("Orthopaedics")],
        ["/specialties/dermatology", t("Dermatology")],
        ["/specialties/general-physician", t("General Physician")],
        ["/specialties/psychology", t("Psychology")],
      ],
    },
    {
      title: t("Company"),
      links: [
        ["/about", t("About us")],
        ["/contact", t("Contact")],
        ["/for-doctors", t("For doctors")],
        ["/legal/grievance", t("Grievance officer")],
        ["/help/complaints", t("Complaints")],
      ],
    },
    {
      title: t("Legal"),
      links: [
        ["/legal/terms", t("Terms of use")],
        ["/legal/privacy", t("Privacy policy")],
        ["/legal/telemedicine-consent", t("Telemedicine consent")],
        ["/legal/refunds", t("Refunds and cancellation")],
        ["/legal/cookies", t("Cookie policy")],
        ["/legal/medical-disclaimer", t("Medical disclaimer")],
      ],
    },
  ];

  const contact = [
    isSet(brand.supportPhone) ? { Icon: Phone, label: t("Phone"), value: brand.supportPhone, href: telHref(brand.supportPhone) } : null,
    isSet(brand.whatsapp) ? { Icon: MessageCircle, label: t("WhatsApp"), value: brand.whatsapp, href: `https://wa.me/${brand.whatsapp.replace(/\D/g, "")}` } : null,
    isSet(brand.supportEmail) ? { Icon: Mail, label: t("Email"), value: brand.supportEmail, href: `mailto:${brand.supportEmail}` } : null,
  ].filter((c) => c !== null);

  const entity = isSet(brand.legalEntity) ? brand.legalEntity : brand.name;
  const companyLines = [
    isSet(brand.registeredAddress) ? `${t("Registered office")}: ${brand.registeredAddress}` : null,
    isSet(brand.gstin) ? `${t("GSTIN")}: ${brand.gstin}` : null,
  ].filter((c) => c !== null);
  const grievance = isSet(brand.grievanceOfficer.name) && isSet(brand.grievanceOfficer.email) ? brand.grievanceOfficer : null;

  return (
    <footer className="mt-16 bg-navy pb-24 text-on-navy md:pb-10">
      <div className="container-page grid gap-10 py-12 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
        <div className="space-y-5">
          <Logo light />
          <p className="max-w-sm text-navy-muted">
            {t("Consult doctors registered in India from anywhere in the world, and plan your treatment in India with a team that helps at every step.")}
          </p>
          <ul className="space-y-2 text-sm text-navy-muted">
            <li className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
              {t("Every doctor's registration is checked before they are listed")}
            </li>
            <li className="flex items-start gap-2">
              <Lock className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
              {t("Encrypted video calls and secure records")}
            </li>
            <li className="flex items-start gap-2">
              <Undo2 className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
              {t("Full refund if the doctor does not join within 10 minutes")}
            </li>
          </ul>
          {contact.length ? (
            <ul className="space-y-1 text-sm" aria-label={t("Contact us")}>
              {contact.map(({ Icon, label, value, href }) => (
                <li key={label}>
                  <a href={href} className="inline-flex min-h-9 items-center gap-2 text-on-navy hover:underline">
                    <Icon className="size-4 shrink-0 text-navy-muted" aria-hidden />
                    <span className="sr-only">{label}: </span>
                    <span dir="ltr">{value}</span>
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 lg:col-span-4">
          {cols.map((c) => (
            <nav key={c.title} aria-label={c.title}>
              <h2 className="mb-3 font-semibold text-on-navy">{c.title}</h2>
              <ul className="space-y-1">
                {c.links.map(([href, label]) => (
                  <li key={href}>
                    <Link href={href} className="inline-flex min-h-9 items-center text-navy-muted hover:text-on-navy hover:underline">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-page space-y-4 py-6 text-sm text-navy-muted">
          <p className="font-medium text-on-navy">
            {t("This service is not for emergencies. In an emergency, go to the nearest hospital or call your local emergency number.")}
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p>
                © {new Date().getFullYear()} {entity}
              </p>
              {companyLines.map((line) => (
                <p key={line}>{line}</p>
              ))}
              {grievance ? (
                <p>
                  {t("Grievance officer")}: {grievance.name},{" "}
                  <a className="underline hover:text-on-navy" href={`mailto:${grievance.email}`}>
                    {grievance.email}
                  </a>
                </p>
              ) : null}
            </div>
            <CurrencySelect currency={currency} className="text-on-navy" />
          </div>
        </div>
      </div>
    </footer>
  );
}
