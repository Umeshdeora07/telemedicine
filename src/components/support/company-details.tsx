import { Mail, MessageCircle, Phone } from "lucide-react";
import type { T } from "@/i18n/translate";
import { company, grievance, supportContacts, type SupportContact } from "./brand-info";

/** Legal entity, registered office, GSTIN and grievance officer: only the details that are filled in. Renders nothing otherwise. */
export function CompanyDetails({ t, className }: { t: T; className?: string }) {
  const rows: { label: string; value: React.ReactNode }[] = [];
  if (company.legalEntity) rows.push({ label: t("Company"), value: company.legalEntity });
  if (company.registeredAddress) rows.push({ label: t("Registered office"), value: company.registeredAddress });
  if (company.gstin) rows.push({ label: t("GSTIN"), value: <span className="font-mono">{company.gstin}</span> });
  if (grievance.name || grievance.email || grievance.phone)
    rows.push({
      label: t("Grievance officer"),
      value: (
        <span className="space-y-0.5">
          {grievance.name ? <span className="block">{grievance.name}</span> : null}
          {grievance.email ? (
            <a href={`mailto:${grievance.email}`} className="block text-primary underline">
              {grievance.email}
            </a>
          ) : null}
          {grievance.phone ? (
            <a href={`tel:${grievance.phone.replace(/[^\d+]/g, "")}`} className="block text-primary underline" dir="ltr">
              {grievance.phone}
            </a>
          ) : null}
          <span className="block text-sm text-fg-muted">{t(grievance.hours)}</span>
        </span>
      ),
    });
  if (!rows.length) return null;
  return (
    <dl className={className ?? "card grid gap-4 p-5 sm:grid-cols-2"}>
      {rows.map((r) => (
        <div key={r.label}>
          <dt className="text-sm text-fg-muted">{r.label}</dt>
          <dd className="font-medium text-heading">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

const ICON = { whatsapp: MessageCircle, phone: Phone, email: Mail } as const;

export function contactTitle(t: T, c: SupportContact) {
  return c.kind === "whatsapp" ? t("WhatsApp") : c.kind === "phone" ? t("Phone") : t("Email");
}

/** Cards for the configured support contacts (WhatsApp, phone, email). Renders nothing when none is set. */
export function ContactCards({ t, className }: { t: T; className?: string }) {
  const contacts = supportContacts();
  if (!contacts.length) return null;
  return (
    <ul className={className ?? "grid gap-3 sm:grid-cols-3"}>
      {contacts.map((c) => {
        const Icon = ICON[c.kind];
        return (
          <li key={c.kind}>
            <a
              href={c.href}
              {...(c.kind === "whatsapp" ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              className="card flex h-full min-h-16 items-center gap-3 p-4 hover:border-primary"
            >
              <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                <Icon className="size-5" />
              </span>
              <span className="min-w-0">
                <span className="block font-semibold text-heading">{contactTitle(t, c)}</span>
                <span className="block truncate text-fg-muted" dir={c.kind === "email" ? undefined : "ltr"}>
                  {c.value}
                </span>
              </span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
