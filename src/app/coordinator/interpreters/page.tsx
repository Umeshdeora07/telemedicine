import type { Metadata } from "next";
import { getViewContext } from "@/server/context";
import { interpreterQueue, listInterpreters } from "@/server/coordinator";
import { SPOKEN_LANGUAGES } from "@/config/languages";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { InterpreterAssign } from "@/components/coordinator/coordinator-tools";

export const metadata: Metadata = { title: "Interpreters" };

export default async function Interpreters() {
  const ctx = await getViewContext();
  const { t, fmt } = ctx;
  const [q, people] = await Promise.all([interpreterQueue(), listInterpreters()]);
  const lang = (c: string) => t(SPOKEN_LANGUAGES[c as keyof typeof SPOKEN_LANGUAGES] ?? c);
  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader title={t("Interpreters for consults")} description={t("Assign a medically trained interpreter and send them the join link, which works only once. They join the call as a third person, and the doctor sees who is present.")} />
      {q.length ? (
        <ul className="space-y-3">
          {q.map((r) => (
            <li key={r.a.id} className="card grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
              <div>
                <p className="font-semibold">{r.patientName} → {r.doctorName}</p>
                <p className="text-sm text-fg-muted">{fmt.dateTime(r.a.startAt, "Asia/Kolkata")} IST · {r.a.ref} · {t(r.a.mode)}</p>
                <p className="mt-1 flex flex-wrap gap-2"><Badge tone="primary">{lang(r.a.interpreterLanguage!)}</Badge>{r.interpreterName ? <Badge tone="success">{t("Assigned: {name}", { name: r.interpreterName })}</Badge> : <Badge tone="accent">{t("Needs interpreter")}</Badge>}</p>
              </div>
              {!r.a.interpreterId ? <InterpreterAssign apptId={r.a.id} options={people.filter((p) => p.languages.includes(r.a.interpreterLanguage!)).map((p) => ({ id: p.id, label: `${p.name}${p.medicalCertified ? " ✓" : ""}` }))} /> : null}
            </li>
          ))}
        </ul>
      ) : <EmptyState title={t("No upcoming consults need an interpreter")} />}
      <section className="space-y-2" aria-labelledby="pool">
        <h2 id="pool" className="text-lg font-bold">{t("Interpreter pool")}</h2>
        <ul className="card divide-y divide-line">
          {people.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-2 p-3">
              <strong>{p.name}</strong>
              {p.languages.map((l) => <Badge key={l}>{lang(l)}</Badge>)}
              {p.medicalCertified ? <Badge tone="success">{t("Medical certified")}</Badge> : null}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
