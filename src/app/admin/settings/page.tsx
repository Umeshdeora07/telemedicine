import type { Metadata } from "next";
import { getViewContext } from "@/server/context";
import { getSettingsBundle } from "@/server/admin";
import { getPolicy } from "@/server/booking";
import { CURRENCY_CODES } from "@/config/currencies";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { CountryToggles, CouponForm, CouponToggle, EmergencyForm, PolicyForm, RateForm } from "@/components/admin/admin-forms";

export const metadata: Metadata = { title: "Countries, rates and offers" };

export default async function SettingsPage() {
  const ctx = await getViewContext();
  const { t, fmt } = ctx;
  const [b, policy] = await Promise.all([getSettingsBundle(), getPolicy()]);
  const latest = CURRENCY_CODES.filter((c) => c !== "INR").map((c) => b.rates.find((r) => r.quote === c)).filter(Boolean);
  return (
    <div className="max-w-5xl space-y-8">
      <PageHeader title={t("Countries, rates and offers")} description={t("Turn countries on as the legal and licensing review for each is done. Changes are logged.")} />

      <section className="space-y-3" aria-labelledby="countries">
        <h2 id="countries" className="text-lg font-bold">{t("Countries")}</h2>
        <p className="text-sm text-fg-muted">{t("“Sign-ups open” lets people from that country create accounts (for consults with Indian doctors where allowed, and treatment in India). “Local-licence consults” shows doctors licensed in that country to patients located there.")}</p>
        <ul className="space-y-3">
          {b.countries.map((c) => (
            <li key={c.code} className="card space-y-2 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <strong>{t(c.name)}</strong>
                <Badge>{c.code}</Badge>
                <Badge>{c.currency}</Badge>
                {c.licenceScope === "region" ? <Badge tone="primary">{t("Licensed by state")}</Badge> : null}
                <span className="ms-auto"><CountryToggles code={c.code} enabled={c.enabled} local={c.localConsultsEnabled} /></span>
              </div>
              {c.legalNotes ? <p className="text-sm text-fg-muted">{c.legalNotes}</p> : null}
              <EmergencyForm code={c.code} e={c.emergency} />
            </li>
          ))}
        </ul>
      </section>

      <section className="card space-y-3 p-5" aria-labelledby="fx">
        <h2 id="fx" className="text-lg font-bold">{t("Exchange rates")}</h2>
        <p className="text-sm text-fg-muted">{t("Prices are set in rupees and shown in the patient's currency at the latest rate. Update rates daily (or connect a rates feed).")}</p>
        <ul className="flex flex-wrap gap-2">
          {latest.map((r) => <li key={r!.quote}><Badge>{`1 INR = ${r!.rate} ${r!.quote} · ${fmt.date(r!.asOf)}`}</Badge></li>)}
        </ul>
        <RateForm currencies={CURRENCY_CODES.filter((c) => c !== "INR")} />
      </section>

      <section className="card space-y-3 p-5" aria-labelledby="policy">
        <h2 id="policy" className="text-lg font-bold">{t("Cancellation and refund policy")}</h2>
        <PolicyForm p={policy} />
      </section>

      <section className="card space-y-3 p-5" aria-labelledby="coupons">
        <h2 id="coupons" className="text-lg font-bold">{t("Coupons")}</h2>
        <ul className="divide-y divide-line">
          {b.coupons.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-2 py-2">
              <code className="font-bold">{c.code}</code>
              <span className="text-sm text-fg-muted">{c.kind === "percent" ? `${c.value}%` : fmt.money(c.value, "INR")} · {c.description} · {t("used {n}", { n: c.usedCount })}{c.maxUses ? ` / ${c.maxUses}` : ""}</span>
              <span className="ms-auto flex items-center gap-2"><Badge tone={c.active ? "success" : "neutral"}>{c.active ? t("Active") : t("Off")}</Badge><CouponToggle id={c.id} active={c.active} /></span>
            </li>
          ))}
        </ul>
        <CouponForm />
      </section>

      <section className="card space-y-3 p-5" aria-labelledby="plans">
        <h2 id="plans" className="text-lg font-bold">{t("Plans")}</h2>
        <ul className="divide-y divide-line">
          {b.plans.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-2 py-2">
              <strong>{t(p.name)}</strong>
              <span className="text-sm text-fg-muted">{fmt.money(p.priceMinor, p.currency)} / {t(p.interval)} · {t("{n} consults", { n: p.consultsPerMonth })} · {t("{n} members", { n: p.membersAllowed })}</span>
              <Badge tone={p.active ? "success" : "neutral"} className="ms-auto">{p.active ? t("Active") : t("Off")}</Badge>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
