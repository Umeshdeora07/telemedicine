import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getRoomAccess } from "@/server/room";
import { getSession } from "@/server/auth/session";
import { getViewContext } from "@/server/context";
import { joinWindow } from "@/server/room-guard";
import { ConsultRoom } from "@/components/room/consult-room";
import { ConsultPanel } from "@/components/doctor/consult-panel";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = { title: "Consult room" };

export default async function ConsultRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await getRoomAccess(id);
  const session = await getSession();
  if (!access) {
    if (!session) redirect(`/login?next=/consult/${id}`);
    if (session.user.role === "doctor" && !session.mfaVerified) redirect(`/mfa?next=/consult/${id}`);
    const { t } = await getViewContext();
    return (
      <div className="container-page max-w-lg py-16">
        <Alert tone="warning" title={t("You can't join this consult")}>{t("Only the patient, family members they have approved, invited guests and the doctor can join.")}</Alert>
      </div>
    );
  }
  const ctx = await getViewContext();
  const { t, fmt } = ctx;
  const a = access.appointment;
  const win = joinWindow(a, access.role);
  const isDoctor = access.role === "doctor";
  const summaryHref = isDoctor ? "/doctor" : access.userId ? `/consults/${a.id}` : "/";
  if (!win.ok && a.status !== "completed") {
    return (
      <div className="container-page max-w-lg space-y-4 py-16">
        <Alert tone="info" title={win.reason === "too_early" ? t("The room isn't open yet") : t("This consult isn't active")}>
          {win.reason === "too_early" && "opensAt" in win && win.opensAt ? t("You can join from {time}.", { time: fmt.dateTime(win.opensAt) }) : t("Check the booking for details.")}
        </Alert>
        <div className="flex gap-2">
          <ButtonLink href={`/consult/${a.id}/check`} variant="secondary">{t("Test camera and mic")}</ButtonLink>
          {access.userId ? <Link href={summaryHref} className="tap inline-flex items-center font-semibold text-primary">{t("Back")}</Link> : null}
        </div>
      </div>
    );
  }
  return (
    <ConsultRoom
      apptId={a.id}
      role={access.role}
      mode={a.mode}
      doctorName={access.doctor.fullName}
      patientName={access.patient.fullName}
      startAtLabel={`${fmt.dateTime(a.startAt)} (${fmt.zone()})`}
      summaryHref={summaryHref}
      backHref={isDoctor ? "/doctor" : access.userId ? `/consults/${a.id}` : "/"}
      canInvite={access.role !== "interpreter" && Boolean(access.userId)}
      panel={isDoctor && session ? <ConsultPanel access={access} user={session.user} /> : undefined}
    />
  );
}
