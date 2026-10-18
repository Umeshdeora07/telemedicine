import { brand } from "@/config/brand";

/**
 * Company and contact details from src/config/brand.ts, but only the ones that
 * have been filled in. The shipped defaults are placeholders (they contain
 * "placeholder", "to be added", ".example" or a dummy +91 80000 0000x number),
 * and those are never shown to visitors. Same rule as the site footer.
 */
export function isConfigured(value: string | null | undefined): value is string {
  if (!value) return false;
  return !/placeholder|to be (added|appointed)|\.example\b|80000 0000\d/i.test(value);
}

const set = (value: string) => (isConfigured(value) ? value : null);

export const company = {
  legalEntity: set(brand.legalEntity),
  registeredAddress: set(brand.registeredAddress),
  gstin: set(brand.gstin),
};

export const grievance = {
  name: set(brand.grievanceOfficer.name),
  email: set(brand.grievanceOfficer.email),
  phone: set(brand.grievanceOfficer.phone),
  hours: brand.grievanceOfficer.hours,
  acknowledgeHours: brand.grievanceSla.acknowledgeHours,
  resolveDays: brand.grievanceSla.resolveDays,
};

export type SupportContact = { kind: "whatsapp" | "phone" | "email"; value: string; href: string };

/** Support contacts that are configured, WhatsApp first. Empty while brand.ts still holds placeholders. */
export function supportContacts(): SupportContact[] {
  const out: SupportContact[] = [];
  if (isConfigured(brand.whatsapp)) out.push({ kind: "whatsapp", value: brand.whatsapp, href: `https://wa.me/${brand.whatsapp.replace(/\D/g, "")}` });
  if (isConfigured(brand.supportPhone)) out.push({ kind: "phone", value: brand.supportPhone, href: `tel:${brand.supportPhone.replace(/[^\d+]/g, "")}` });
  if (isConfigured(brand.supportEmail)) out.push({ kind: "email", value: brand.supportEmail, href: `mailto:${brand.supportEmail}` });
  return out;
}

/** True when any company detail is filled in. */
export function hasCompanyDetails() {
  return Boolean(company.legalEntity || company.registeredAddress || company.gstin || grievance.name || grievance.email);
}
