import type { Metadata } from "next";
import { Phone } from "lucide-react";
import { getViewContext } from "@/server/context";
import { callbackQueue } from "@/server/coordinator";
import { SPOKEN_LANGUAGES } from "@/config/languages";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { CallbackControls } from "@/components/coordinator/coordinator-tools";

export const metadata: Metadata = { title: "Callbacks" };

const REASONS: Record<string, string> = { booking_help: "Help booking", payment: "Payment", technical: "Technical problem", international: "Treatment in India", other: "Other" };

export default async function Callbacks() {
  const ctx = await getViewContext();
  const { t, fmt } = ctx;
  const rows = await callbackQueue();
  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader title={t("Callback requests")} description={t("Call back in the patient's language. Note what you helped with so the next person has context.")} />
      {rows.length ? (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id} className="card grid gap-3 p-4 sm:grid-cols-[1fr_16rem]">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <strong className="text-lg">{r.name}</strong>
                  <Badge tone={r.status === "open" ? "accent" : r.status === "in_progress" ? "warning" : "success"}>{r.status === "open" ? t("Waiting") : r.status === "in_progress" ? t("In progress") : t("Done")}</Badge>
                  <Badge>{t(REASONS[r.reason] ?? r.reason)}</Badge>
                </div>
                <p><a href={`tel:${r.phone}`} className="inline-flex items-center gap-1 font-semibold text-primary underline"><Phone className="size-4" aria-hidden />{r.phone}</a> · {t("Speaks {lang}", { lang: t(SPOKEN_LANGUAGES[r.language as keyof typeof SPOKEN_LANGUAGES] ?? r.language) })}</p>
                {r.preferredTime ? <p className="text-sm text-fg-muted">{t("Best time: {time}", { time: r.preferredTime })}</p> : null}
                {r.note ? <p className="rounded-lg bg-surface-2 p-2">{r.note}</p> : null}
                <p className="text-sm text-fg-muted">{t("Requested {when}", { when: fmt.dateTime(r.createdAt) })}{r.assignee ? ` · ${t("with {name}", { name: r.assignee })}` : ""}</p>
                {r.outcome ? <p className="text-sm"><strong>{t("Outcome:")}</strong> {r.outcome}</p> : null}
              </div>
              <CallbackControls id={r.id} status={r.status} />
            </li>
          ))}
        </ul>
      ) : <EmptyState icon={<Phone className="size-8" aria-hidden />} title={t("No callback requests")} />}
    </div>
  );
}
