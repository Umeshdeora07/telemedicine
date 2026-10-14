import { Check } from "lucide-react";
import type { plans } from "@/db/schema";
import type { ViewContext } from "@/server/context";
import { BuyPlanForm } from "./plan-forms";
import { ButtonLink } from "@/components/ui/button";

export function PlanCards({ list, ctx, people }: { list: (typeof plans.$inferSelect)[]; ctx: ViewContext; people: { id: string; name: string }[] | null }) {
  const { t, fmt } = ctx;
  return (
    <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {list.map((p) => (
        <li key={p.id} className="card flex flex-col gap-3 p-5">
          <h3 className="text-lg font-bold">{t(p.name)}</h3>
          <p><span className="text-3xl font-extrabold text-heading">{fmt.money(p.priceMinor, p.currency)}</span> <span className="text-fg-muted">/ {t("month")}</span></p>
          <ul className="flex-1 space-y-1.5">
            {p.features.map((f) => <li key={f} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />{t(f)}</li>)}
          </ul>
          {people ? <BuyPlanForm slug={p.slug} members={p.membersAllowed} people={people} /> : <ButtonLink href={`/login?next=/plans`} variant="secondary">{t("Choose")}</ButtonLink>}
        </li>
      ))}
    </ul>
  );
}
