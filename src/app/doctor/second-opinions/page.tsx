import type { Metadata } from "next";
import Link from "next/link";
import { FileText } from "lucide-react";
import { getViewContext } from "@/server/context";
import { doctorForUser } from "@/server/consult";
import { doctorSecondOpinions } from "@/server/doctor-portal";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Second opinions" };

export default async function DoctorSecondOpinions() {
  const ctx = await getViewContext();
  const { t, fmt } = ctx;
  const d = (await doctorForUser(ctx.user!))!;
  const list = await doctorSecondOpinions(d);
  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title={t("Second opinions")} description={t("Written opinions on reports, within 48 hours. Advice only — no prescriptions.")} />
      {list.length ? (
        <ul className="space-y-3">
          {list.map(({ s, patientName }) => {
            const overdue = s.status === "assigned" && s.dueAt && s.dueAt < new Date();
            return (
              <li key={s.id}>
                <Link href={`/doctor/second-opinions/${s.id}`} className="card flex flex-wrap items-center gap-2 p-4 hover:border-primary">
                  <FileText className="size-5 text-primary" aria-hidden />
                  <span className="font-semibold">{patientName}</span>
                  <span className="text-sm text-fg-muted">{s.ref}</span>
                  <span className="ms-auto">
                    {s.status === "answered" ? <Badge tone="success">{t("Answered")}</Badge> : overdue ? <Badge tone="danger">{t("Overdue")}</Badge> : <Badge tone="warning">{t("Due {date}", { date: fmt.dateTime(s.dueAt!) })}</Badge>}
                  </span>
                  <p className="line-clamp-2 w-full text-fg-muted">{s.question}</p>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState icon={<FileText className="size-8" aria-hidden />} title={t("No second opinion requests")}>{t("Turn on second opinions in your profile to receive requests.")}</EmptyState>
      )}
    </div>
  );
}
