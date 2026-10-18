import { Mail, MessageCircle, Phone, PhoneCall } from "lucide-react";
import { brand } from "@/config/brand";
import { PHOTOS } from "@/config/images";
import type { T } from "@/i18n/translate";
import { ButtonLink, buttonClass } from "@/components/ui/button";
import { Photo } from "@/components/ui/photo";

/** True when a value in src/config/brand.ts has been filled in (not the shipped placeholder). Same rule as the footer. */
function isSet(value: string | null | undefined): value is string {
  if (!value) return false;
  return !/placeholder|to be (added|appointed)|\.example\b|80000 0000\d/i.test(value);
}

export type ContactLink = { kind: "whatsapp" | "phone" | "email"; value: string; href: string };

/** The support contacts that are configured, WhatsApp first. Empty while brand.ts still holds placeholders. */
export function brandContacts(): ContactLink[] {
  const out: ContactLink[] = [];
  if (isSet(brand.whatsapp)) out.push({ kind: "whatsapp", value: brand.whatsapp, href: `https://wa.me/${brand.whatsapp.replace(/\D/g, "")}` });
  if (isSet(brand.supportPhone)) out.push({ kind: "phone", value: brand.supportPhone, href: `tel:${brand.supportPhone.replace(/[^\d+]/g, "")}` });
  if (isSet(brand.supportEmail)) out.push({ kind: "email", value: brand.supportEmail, href: `mailto:${brand.supportEmail}` });
  return out;
}

/** WhatsApp link when configured, else null. */
export function whatsappLink(): ContactLink | null {
  return brandContacts().find((c) => c.kind === "whatsapp") ?? null;
}

const ICON = { whatsapp: MessageCircle, phone: Phone, email: Mail } as const;

export function contactLabel(t: T, c: ContactLink) {
  return c.kind === "whatsapp" ? t("Chat on WhatsApp") : c.kind === "phone" ? t("Call {phone}", { phone: c.value }) : t("Email us");
}

/**
 * Buttons for the configured contacts, then "Request a call back". The first
 * button is the solid one unless `lead` is false (when another button on the
 * same row already leads). `onBlue` styles them for the blue call to action band.
 */
export function ContactButtons({ t, reason, onBlue = false, lead = true }: { t: T; reason?: string; onBlue?: boolean; lead?: boolean }) {
  const contacts = brandContacts();
  const callback = reason ? `/help/callback?reason=${reason}` : "/help/callback";
  const solid = onBlue ? "bg-on-primary text-primary hover:bg-on-primary/90 shadow-sm" : "";
  const quiet = onBlue ? "border border-on-primary/70 bg-transparent text-on-primary hover:bg-on-primary/10" : "";
  const style = (first: boolean) => (lead && first ? (["primary", solid] as const) : (["outline", quiet] as const));
  const [cbVariant, cbClass] = style(contacts.length === 0);
  return (
    <>
      {contacts.map((c, i) => {
        const Icon = ICON[c.kind];
        const [variant, extra] = style(i === 0);
        return (
          <a
            key={c.kind}
            href={c.href}
            {...(c.kind === "whatsapp" ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            className={buttonClass(variant, "lg", extra)}
          >
            <Icon className="size-5" aria-hidden />
            {contactLabel(t, c)}
          </a>
        );
      })}
      <ButtonLink href={callback} size="lg" variant={cbVariant} className={cbClass}>
        <PhoneCall className="size-5" aria-hidden />
        {t("Request a call back")}
      </ButtonLink>
    </>
  );
}

/** "Questions? Talk to us" strip with the support photo. */
export function ContactStrip({ t }: { t: T }) {
  return (
    <section aria-labelledby="talk" className="container-page py-12">
      <div className="card grid overflow-hidden md:grid-cols-[1fr_1.4fr]">
        <div className="relative aspect-[16/10] md:aspect-auto md:min-h-72">
          <Photo photo="support" alt={t(PHOTOS.support.alt)} sizes="(min-width: 768px) 28rem, 100vw" className="absolute inset-0" />
        </div>
        <div className="flex flex-col justify-center gap-5 p-6 sm:p-8">
          <div className="space-y-2">
            <h2 id="talk" className="text-2xl font-extrabold sm:text-3xl">
              {t("Questions? Talk to our team")}
            </h2>
            <p className="text-lg text-fg-muted">
              {t("We can help you choose a doctor, book a consultation or plan your treatment in India. Tell us when to call and we will call you back.")}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <ContactButtons t={t} />
          </div>
        </div>
      </div>
    </section>
  );
}

/** True when the company name and registered office are filled in, so the footer shows them. */
export function companyDetailsShown() {
  return isSet(brand.legalEntity) && isSet(brand.registeredAddress);
}
