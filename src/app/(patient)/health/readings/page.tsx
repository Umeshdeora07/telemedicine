import type { Metadata } from "next";
import { getViewContext } from "@/server/context";
import { myPeople } from "@/server/patient";
import { READING_TYPES, readingsFor, type ReadingType } from "@/server/patient-app";
import { PageHeader } from "@/components/ui/page-header";
import { LinkTabs } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { LineChart } from "@/components/charts/charts";
import { AddReadingForm } from "@/components/patient/health-tools";

export const metadata: Metadata = { title: "Health readings" };

const SHOWN: ReadingType[] = ["bp", "glucose_fasting", "glucose_post_meal", "weight", "pulse", "spo2"];

export default async function ReadingsPage({ searchParams }: { searchParams: Promise<{ p?: string; type?: string }> }) {
  const sp = await searchParams;
  const ctx = await getViewContext();
  const { t, fmt, user } = ctx;
  const people = (await myPeople(user!.id)).filter((x) => !x.link || (x.link.status === "active" && x.link.canViewRecords));
  const cur = people.find((x) => x.patient.id === sp.p) ?? people[0];
  if (!cur) return <EmptyState title={t("No profile yet")} />;
  const rows = await readingsFor(user!, cur.patient.id, 120);
  const available = SHOWN.filter((k) => rows.some((r) => r.type === k));
  const type = (SHOWN.includes(sp.type as ReadingType) ? sp.type : available[0] ?? "bp") as ReadingType;
  const data = rows.filter((r) => r.type === type);
  const spec = READING_TYPES[type];
  const q = (extra: Record<string, string>) => `/health/readings?${new URLSearchParams({ p: cur.patient.id, type, ...extra })}`;
  const targets = type === "bp" ? [{ value: 130, label: t("Goal") }, { value: 80, label: t("Goal") }] : type === "glucose_fasting" ? [{ value: 130, label: t("Goal") }] : type === "glucose_post_meal" ? [{ value: 180, label: t("Goal") }] : type === "spo2" ? [{ value: 94, label: t("Low") }] : [];
  const last = data[data.length - 1];
  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader title={t("Health readings")} description={t("Log blood pressure, sugar and weight at home. Your doctor sees the trend at your next consult.")} />
      {people.length > 1 ? <LinkTabs label={t("Whose readings")} current={cur.patient.id} tabs={people.map((x) => ({ key: x.patient.id, href: `/health/readings?p=${x.patient.id}`, label: x.link ? x.patient.fullName.split(" ")[0]! : t("Me") }))} /> : null}
      <LinkTabs label={t("Reading type")} current={type} tabs={SHOWN.map((k) => ({ key: k, href: q({ type: k }), label: t(READING_TYPES[k].label), count: rows.filter((r) => r.type === k).length || undefined }))} />
      {last ? (
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="card p-4"><dt className="text-sm text-fg-muted">{t("Latest")}</dt><dd className="text-2xl font-bold text-heading">{type === "bp" ? `${last.value}/${last.value2}` : last.value} <span className="text-base font-normal text-fg-muted">{spec.unit}</span></dd><dd className="text-sm text-fg-muted">{fmt.dateTime(last.takenAt)}</dd></div>
          <div className="card p-4"><dt className="text-sm text-fg-muted">{t("Average (last 30 days)")}</dt><dd className="text-2xl font-bold text-heading">{(() => { const recent = data.filter((r) => r.takenAt.getTime() > Date.now() - 30 * 86400_000); if (!recent.length) return "—"; const avg = (k: "value" | "value2") => Math.round(recent.reduce((s, r) => s + (r[k] ?? 0), 0) / recent.length); return type === "bp" ? `${avg("value")}/${avg("value2")}` : avg("value"); })()}</dd></div>
          <div className="card p-4"><dt className="text-sm text-fg-muted">{t("Readings")}</dt><dd className="text-2xl font-bold text-heading">{data.length}</dd></div>
        </dl>
      ) : null}
      <section className="card p-5">
        <LineChart
          title={t("{what} over time", { what: t(spec.label) })}
          unit={spec.unit}
          tableCaption={t("{what} readings", { what: t(spec.label) })}
          series={type === "bp" ? [{ key: "sys", name: t("Upper (systolic)"), color: "var(--series-1)" }, { key: "dia", name: t("Lower (diastolic)"), color: "var(--series-2)" }] : [{ key: "v", name: t(spec.label), color: "var(--series-1)" }]}
          targets={targets}
          points={data.map((r) => ({ at: r.takenAt.toISOString(), label: fmt.date(r.takenAt, undefined, { day: "numeric", month: "short", year: undefined }), values: type === "bp" ? [r.value, r.value2] : [r.value] }))}
        />
      </section>
      <section className="card space-y-3 p-5" aria-labelledby="add">
        <h2 id="add" className="text-lg font-bold">{t("Add a reading")}</h2>
        <AddReadingForm patientId={cur.patient.id} types={SHOWN.map((k) => ({ key: k, label: READING_TYPES[k].label, unit: READING_TYPES[k].unit }))} />
        <p className="text-sm text-fg-muted">{t("These numbers help your doctor; they are not a diagnosis. If a reading worries you, book a consult.")}</p>
      </section>
    </div>
  );
}
