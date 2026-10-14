import type { Metadata } from "next";
import { getViewContext } from "@/server/context";
import { brand } from "@/config/brand";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "About us" };

export default async function About() {
  const { t } = await getViewContext();
  return (
    <div className="container-page max-w-3xl space-y-6 py-8">
      <PageHeader title={t("About {brand}", { brand: brand.name })} description={t(brand.tagline)} />
      <div className="prose-calm">
        <p>{t("We started with a simple worry: a parent in a small town, a child working far away, and a health question that can't wait. Good doctors exist; getting to them is the hard part.")}</p>
        <h2>{t("What we believe")}</h2>
        <ul>
          <li>{t("Every doctor must be verified, and patients should see that proof.")}</li>
          <li>{t("Online care has limits. When you need to be examined, we make the clinic visit easy — not an afterthought.")}</li>
          <li>{t("Prices are shown in full before you pay, and refunds are automatic when we let you down.")}</li>
          <li>{t("Your health records are yours. You decide who sees them.")}</li>
          <li>{t("Care should work in your language, on a slow phone, for someone who isn't comfortable with apps.")}</li>
        </ul>
        <h2>{t("How we follow the rules")}</h2>
        <p>{t("Consults follow India's Telemedicine Practice Guidelines, 2020. We protect personal data under the Digital Personal Data Protection Act, 2023, and follow GDPR or HIPAA where they apply to you.")}</p>
        <p>{t("{entity}, {address}.", { entity: brand.legalEntity, address: brand.registeredAddress })}</p>
      </div>
    </div>
  );
}
