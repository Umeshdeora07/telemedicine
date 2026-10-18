import Link from "next/link";
import { Building2, MessageSquare, Phone, QrCode, Video } from "lucide-react";
import { DoctorAvatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import type { ApptRow } from "@/server/patient";
import type { ViewContext } from "@/server/context";

const ICON = { video: Video, audio: Phone, chat: MessageSquare, in_clinic: Building2 } as const;

export function statusBadge(status: string, t: ViewContext["t"]) {
  const map: Record<string, [string, "neutral" | "primary" | "success" | "warning" | "danger"]> = {
    confirmed: [t("Confirmed"), "primary"],
    checked_in: [t("Checked in"), "success"],
    in_progress: [t("In progress"), "success"],
    completed: [t("Completed"), "neutral"],
    cancelled: [t("Cancelled"), "neutral"],
    doctor_no_show: [t("Doctor did not join, refunded"), "warning"],
    patient_no_show: [t("Missed"), "warning"],
    expired: [t("Not paid"), "neutral"],
    pending_payment: [t("Payment sent, waiting for the doctor"), "warning"],
  };
  const [label, tone] = map[status] ?? [status, "neutral"];
  return <Badge tone={tone}>{label}</Badge>;
}

export function AppointmentCard({ r, ctx, showJoin = true }: { r: ApptRow; ctx: ViewContext; showJoin?: boolean }) {
  const { t, fmt } = ctx;
  const a = r.a;
  const Icon = ICON[a.mode];
  const minutesToStart = (a.startAt.getTime() - Date.now()) / 60_000;
  const joinable = a.mode !== "in_clinic" && ["confirmed", "in_progress"].includes(a.status) && minutesToStart < 15 && minutesToStart > -60;
  const modeLabel = { video: t("Video consultation"), audio: t("Audio call"), chat: t("Chat consultation"), in_clinic: t("Clinic visit") }[a.mode];
  return (
    <article className="card flex flex-col gap-3 p-4" aria-labelledby={`appt-${a.id}`}>
      <div className="flex items-start gap-3">
        <DoctorAvatar name={r.doctorName} seed={r.doctorSeed} gender={r.doctorGender} photoUrl={r.doctorPhoto} size={48} senior={r.doctorExp >= 20} />
        <div className="min-w-0 flex-1">
          <h3 id={`appt-${a.id}`} className="font-bold">
            <Link href={`/consults/${a.id}`} className="hover:underline">{r.doctorName}</Link>
          </h3>
          <p className="text-sm text-fg-muted">{t(r.specialty)}</p>
        </div>
        {statusBadge(a.status, t)}
      </div>
      <p className="flex items-center gap-2">
        <Icon className="size-4 text-primary" aria-hidden />
        <span>
          <strong>{fmt.dateTime(a.startAt)}</strong> · {modeLabel}
        </span>
      </p>
      <p className="text-sm text-fg-muted">
        {t("For {name}", { name: r.patientName })}
        {r.clinicName ? ` · ${r.clinicName}, ${r.clinicCity}` : ""}
      </p>
      {showJoin ? (
        <div className="flex flex-wrap gap-2">
          {joinable ? (
            <ButtonLink href={`/consult/${a.id}`} size="sm">
              <Video className="size-4" aria-hidden />
              {t("Join now")}
            </ButtonLink>
          ) : null}
          {a.mode === "in_clinic" && ["confirmed", "checked_in"].includes(a.status) ? (
            <ButtonLink href={`/consults/${a.id}/pass`} size="sm" variant="secondary">
              <QrCode className="size-4" aria-hidden />
              {t("Visit pass")}
            </ButtonLink>
          ) : null}
          {a.status === "confirmed" && !a.preConsult && a.mode !== "in_clinic" ? (
            <ButtonLink href={`/consults/${a.id}/prepare`} size="sm" variant="outline">
              {t("Fill in the health form")}
            </ButtonLink>
          ) : null}
          <ButtonLink href={`/consults/${a.id}`} size="sm" variant="ghost">
            {t("Details")}
          </ButtonLink>
        </div>
      ) : null}
    </article>
  );
}
