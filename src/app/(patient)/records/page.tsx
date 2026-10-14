import type { Metadata } from "next";
import Link from "next/link";
import { FileText, FolderHeart, Link2, Pill, ShieldCheck, Stethoscope } from "lucide-react";
import { getViewContext } from "@/server/context";
import { myPeople } from "@/server/patient";
import { recordsFor } from "@/server/patient-app";
import { revokeGrantAction, revokeShareAction } from "@/server/actions/patient-app";
import { PageHeader } from "@/components/ui/page-header";
import { LinkTabs } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { FileUploader } from "@/components/common/file-uploader";
import { AbhaForm, ActionButton, DeleteDocButton, ShareForm } from "@/components/patient/records-tools";
import { humanize } from "@/lib/utils";

export const metadata: Metadata = { title: "Health records" };

const CAT_ORDER = ["prescription", "report", "scan", "discharge", "photo", "treatment_plan", "visa_letter", "invoice", "recording"];

export default async function RecordsPage({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const ctx = await getViewContext();
  const { t, fmt, user } = ctx;
  const people = (await myPeople(user!.id)).filter((x) => !x.link || (x.link.status === "active" && x.link.canViewRecords));
  const { p } = await searchParams;
  const current = people.find((x) => x.patient.id === p) ?? people[0];
  if (!current) return <EmptyState title={t("No profile yet")} />;
  const r = await recordsFor(user!, current.patient.id);
  const docs = [...r.docs].sort((a, b) => CAT_ORDER.indexOf(a.category) - CAT_ORDER.indexOf(b.category));
  const groups = [...new Set(docs.map((d) => d.category))];
  const pat = current.patient;

  return (
    <div className="space-y-6">
      <PageHeader title={t("Health records")} description={t("Reports, scans and prescriptions in one safe place. Encrypted, and only shared when you choose.")} />
      {people.length > 1 ? <LinkTabs label={t("Whose records")} current={pat.id} tabs={people.map((x) => ({ key: x.patient.id, href: `/records?p=${x.patient.id}`, label: x.link ? `${x.patient.fullName.split(" ")[0]} (${t(x.link.relationship)})` : t("Me") }))} /> : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="min-w-0 space-y-6">
          <section className="card space-y-3 p-5" aria-labelledby="upload">
            <h2 id="upload" className="text-lg font-bold">{t("Add a report")}</h2>
            <FileUploader fields={{ patientId: pat.id }} hint={t("Photos of paper reports are fine. PDF or image, up to 15 MB.")} />
            <p className="text-sm text-fg-muted">{t("New uploads appear in the list after you refresh the page.")}</p>
          </section>

          {r.rx.length ? (
            <section className="space-y-2" aria-labelledby="rx">
              <h2 id="rx" className="flex items-center gap-2 text-lg font-bold"><Pill className="size-5 text-primary" aria-hidden />{t("Prescriptions")}</h2>
              <ul className="card divide-y divide-line">
                {r.rx.map(({ rx, doctorName }) => (
                  <li key={rx.id}>
                    <Link href={`/prescriptions/${rx.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 p-3 hover:bg-surface-2">
                      <span className="font-semibold">{rx.diagnosis || t("Prescription")}</span>
                      <span className="text-sm text-fg-muted">{doctorName} · {fmt.date(rx.issuedAt)} · {rx.number}</span>
                      {rx.status === "cancelled" ? <Badge tone="danger" className="ms-auto">{t("Cancelled")}</Badge> : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="space-y-3" aria-labelledby="docs">
            <h2 id="docs" className="flex items-center gap-2 text-lg font-bold"><FolderHeart className="size-5 text-primary" aria-hidden />{t("Documents ({n})", { n: docs.length })}</h2>
            {docs.length ? (
              groups.map((g) => (
                <div key={g} className="space-y-1">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-fg-muted">{t(humanize(g))}</h3>
                  <ul className="card divide-y divide-line">
                    {docs.filter((d) => d.category === g).map((d) => (
                      <li key={d.id} className="flex items-center gap-2 p-3">
                        <a href={`/api/documents/${d.id}`} target="_blank" rel="noopener" className="flex min-w-0 flex-1 items-center gap-2 hover:underline">
                          <FileText className="size-4 shrink-0 text-primary" aria-hidden />
                          <span className="truncate">{d.title}</span>
                        </a>
                        <span className="shrink-0 text-sm text-fg-muted">{fmt.date(d.reportDate ?? d.createdAt)}</span>
                        {d.source === "upload" && d.uploadedByUserId === user!.id ? <DeleteDocButton id={d.id} title={d.title} /> : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            ) : (
              <EmptyState icon={<FolderHeart className="size-8" aria-hidden />} title={t("No documents yet")}>{t("Add reports so your doctor can see them, and so you always have them with you.")}</EmptyState>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <section className="card space-y-3 p-5" aria-labelledby="who">
            <h2 id="who" className="flex items-center gap-2 text-lg font-bold"><ShieldCheck className="size-5 text-primary" aria-hidden />{t("Who can see these")}</h2>
            <ul className="space-y-3">
              <li className="text-sm">{t("You{family}, and the doctor during each consult you book.", { family: current.link ? "" : t(" and family members you allow") })}</li>
              {r.grants.map(({ g, doctorName }) => (
                <li key={g.id} className="space-y-1">
                  <p className="flex items-center gap-1.5"><Stethoscope className="size-4 text-primary" aria-hidden /><strong>{doctorName}</strong></p>
                  <p className="text-sm text-fg-muted">{t("Past records, until {date}", { date: fmt.date(g.expiresAt) })}</p>
                  <ActionButton action={revokeGrantAction.bind(null, g.id)} label={t("Stop sharing")} confirmText={t("Stop sharing with this doctor?")} />
                </li>
              ))}
              {r.links.map((l) => (
                <li key={l.id} className="space-y-1">
                  <p className="flex items-center gap-1.5"><Link2 className="size-4 text-primary" aria-hidden /><strong>{l.recipientNote ?? t("Share link")}</strong></p>
                  <p className="text-sm text-fg-muted">{t("{n} documents · opened {c} times · until {date}", { n: l.documentIds.length, c: l.accessCount, date: fmt.date(l.expiresAt) })}</p>
                  <ActionButton action={revokeShareAction.bind(null, l.id)} label={t("Stop link")} confirmText={t("Stop this link now?")} />
                </li>
              ))}
            </ul>
          </section>
          {docs.length ? (
            <section className="card space-y-3 p-5" aria-labelledby="share">
              <h2 id="share" className="text-lg font-bold">{t("Share with another doctor")}</h2>
              <ShareForm patientId={pat.id} docs={docs.map((d) => ({ id: d.id, title: d.title, date: fmt.date(d.reportDate ?? d.createdAt) }))} />
            </section>
          ) : null}
          <section className="card space-y-3 p-5" aria-labelledby="abha">
            <h2 id="abha" className="text-lg font-bold">{t("ABHA (Ayushman Bharat Health Account)")}</h2>
            {pat.abhaAddress ? <p><Badge tone="success">{t("Linked")}</Badge> <span className="font-mono">{pat.abhaAddress}</span></p> : <><p className="text-sm text-fg-muted">{t("Link your ABHA to pull records from other hospitals into this vault (with your consent each time).")}</p><AbhaForm patientId={pat.id} /></>}
          </section>
        </aside>
      </div>
    </div>
  );
}
