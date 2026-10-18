import type { PhotoName } from "@/config/images";
import type { T } from "@/i18n/translate";
import type { ViewContext } from "@/server/context";

/**
 * The four specialties the site offers, in display order, with the extra copy
 * the marketing pages show next to the database text (name, description,
 * symptoms, treatments and FAQs come from the specialties table).
 */
export const SPECIALTY_SLUGS = ["orthopaedics", "dermatology", "general-physician", "psychology"] as const;
export type SpecialtySlug = (typeof SPECIALTY_SLUGS)[number];

export function isSpecialtySlug(slug: string): slug is SpecialtySlug {
  return (SPECIALTY_SLUGS as readonly string[]).includes(slug);
}

/** Photo for each specialty (src/config/images.ts). */
export const SPECIALTY_PHOTO: Record<SpecialtySlug, PhotoName> = {
  orthopaedics: "orthopaedics",
  dermatology: "dermatology",
  "general-physician": "generalPhysician",
  psychology: "psychology",
};

/**
 * Only the four specialties, in display order. An older database may still
 * hold rows for removed specialties; they are left out here.
 */
export function siteSpecialties<S extends { slug: string }>(rows: S[]): (S & { slug: SpecialtySlug })[] {
  return SPECIALTY_SLUGS.flatMap((slug) => rows.filter((r): r is S & { slug: SpecialtySlug } => r.slug === slug));
}

/** "From ₹400" style starting price in the viewer's currency, or null when no fee is known. */
export function startingPrice(ctx: ViewContext, startingFeeMinor: number): string | null {
  if (!startingFeeMinor) return null;
  const price = ctx.priceFor([{ mode: "video", currency: "INR", amountMinor: startingFeeMinor }], "video");
  return ctx.t("From {price}", { price: price?.label ?? ctx.fmt.money(startingFeeMinor, "INR") });
}

export type SpecialtyCopy = {
  /** Who should book this specialty. */
  whoFor: string;
  /** Typical treatments people travel to India for. */
  inIndia: string[];
};

export function specialtyCopy(t: T): Record<SpecialtySlug, SpecialtyCopy> {
  return {
    orthopaedics: {
      whoFor: t(
        "For anyone with pain or stiffness in the joints, back or neck, a sports injury, a fracture that needs follow up, or a doctor's advice to have a joint replaced.",
      ),
      inIndia: [t("Knee and hip replacement"), t("Spine care"), t("Sports injuries")],
    },
    dermatology: {
      whoFor: t("For anyone with a skin, hair or nail problem, such as acne, rashes, itching, hair fall, dark patches or a fungal infection."),
      inIndia: [t("Skin and hair treatments"), t("Treatment for acne scars and pigmentation"), t("Care for psoriasis and eczema")],
    },
    "general-physician": {
      whoFor: t(
        "For everyday illness and long term conditions such as diabetes, blood pressure and thyroid problems. A good first doctor when you are not sure whom to see, because they will tell you if you need a specialist.",
      ),
      inIndia: [t("Full health check ups"), t("Diabetes care"), t("Blood pressure and thyroid care")],
    },
    psychology: {
      whoFor: t(
        "For anyone who feels stressed, anxious or low, sleeps badly, or finds work or relationships hard to manage. You do not need a diagnosis to book.",
      ),
      inIndia: [t("Counselling and therapy"), t("Review by a consultant psychiatrist"), t("Help with stress, anxiety and sleep")],
    },
  };
}
