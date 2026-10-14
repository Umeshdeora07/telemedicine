import type { Metadata } from "next";
import Link from "next/link";
import { getViewContext } from "@/server/context";
import { getSpecialties } from "@/server/queries/reference";
import { PageHeader } from "@/components/ui/page-header";
import { SpecialtyIcon } from "@/components/ui/icon";

export const metadata: Metadata = { title: "Specialties", description: "Find the right kind of doctor: general physician, child specialist, women's health, skin, heart, diabetes, bones and joints, mental health." };

export default async function SpecialtiesPage() {
  const ctx = await getViewContext();
  const { t, fmt } = ctx;
  const specs = await getSpecialties();
  return (
    <div className="container-page space-y-8 py-8">
      <PageHeader title={t("Which doctor do I need?")} description={t("Not sure? Start with a general physician — they treat most problems and refer you if needed. Or try the symptom checker.")} />
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {specs.map((s) => (
          <li key={s.id}>
            <Link href={`/specialties/${s.slug}`} className="card flex h-full flex-col gap-3 p-5 hover:border-primary">
              <span className="grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary"><SpecialtyIcon name={s.icon} className="size-6" /></span>
              <span className="text-lg font-bold text-heading">{t(s.name)}</span>
              <span className="flex-1 text-fg-muted">{t(s.shortDescription)}</span>
              {s.startingFeeMinor ? <span className="text-sm font-semibold">{t("From {fee}", { fee: ctx.priceFor([{ mode: "video", currency: "INR", amountMinor: s.startingFeeMinor }], "video")?.label ?? fmt.money(s.startingFeeMinor, "INR") })}</span> : null}
            </Link>
          </li>
        ))}
      </ul>
      <p className="text-center"><Link href="/triage" className="font-semibold text-primary underline">{t("Not sure? Check your symptoms")}</Link></p>
    </div>
  );
}
