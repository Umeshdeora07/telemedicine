import Link from "next/link";
import { Plane } from "lucide-react";
import type { getViewContext } from "@/server/context";
import { CASE_STEPS, type CaseRow, type CaseStatus } from "@/server/cases";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

type Ctx = Awaited<ReturnType<typeof getViewContext>>;

const TONE: Partial<Record<CaseStatus, "neutral" | "primary" | "success" | "warning" | "danger" | "accent">> = {
  received: "accent",
  under_review: "warning",
  plan_sent: "primary",
  accepted: "success",
  visa_letter_issued: "success",
  in_treatment: "primary",
  closed: "neutral",
};

export function CaseStatusBadge({ status, t }: { status: CaseStatus; t: Ctx["t"] }) {
  return <Badge tone={TONE[status] ?? "neutral"}>{t(CASE_STEPS.find((s) => s.status === status)?.label ?? status)}</Badge>;
}

export function CaseList({ cases, base, ctx }: { cases: { c: CaseRow; patientName: string; clinicName: string | null }[]; base: string; ctx: Ctx }) {
  const { t, fmt } = ctx;
  if (!cases.length) return <EmptyState icon={<Plane className="size-8" aria-hidden />} title={t("No treatment plans yet")} />;
  return (
    <ul className="card divide-y divide-line">
      {cases.map(({ c, patientName, clinicName }) => (
        <li key={c.id}>
          <Link href={`${base}/${c.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 p-4 hover:bg-surface-2">
            <span className="min-w-0">
              <span className="block font-semibold">{patientName} · {c.treatmentInterest}</span>
              <span className="block text-sm text-fg-muted">{c.ref} · {c.homeCountry} · {clinicName ?? t("No hospital yet")} · {t("updated {date}", { date: fmt.date(c.updatedAt) })}</span>
            </span>
            <span className="ms-auto"><CaseStatusBadge status={c.status} t={t} /></span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
