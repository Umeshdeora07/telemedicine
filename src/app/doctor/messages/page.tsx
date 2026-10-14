import type { Metadata } from "next";
import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { MessageSquare } from "lucide-react";
import { withRls } from "@/db";
import { messages } from "@/db/schema";
import { getViewContext } from "@/server/context";
import { doctorForUser } from "@/server/consult";
import { doctorOpenChats } from "@/server/doctor-portal";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { FollowUpChat } from "@/components/patient/follow-up-chat";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Messages" };

export default async function DoctorMessages({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const ctx = await getViewContext();
  const { t, fmt, user } = ctx;
  const d = (await doctorForUser(user!))!;
  const chats = await doctorOpenChats(d);
  const { c } = await searchParams;
  const current = chats.find((x) => x.a.id === c) ?? null;
  const thread = current
    ? await withRls({ userId: user!.id, role: user!.role }, (tx) => tx.select().from(messages).where(eq(messages.appointmentId, current.a.id)).orderBy(asc(messages.id)).limit(200))
    : [];
  return (
    <div className="space-y-6">
      <PageHeader title={t("Follow-up messages")} description={t("Patients can message you free for {n} days after a consult. Reply within {h} hours where you can; ask them to book a consult if a new problem needs assessment.", { n: d.followUpChatDays, h: Math.round(d.chatResponseMinutes / 60) || 1 })} />
      {chats.length ? (
        <div className="grid gap-4 lg:grid-cols-[20rem_1fr]">
          <ul className={cn("card divide-y divide-line self-start", current && "hidden lg:block")} aria-label={t("Open chats")}>
            {chats.map((x) => (
              <li key={x.a.id}>
                <Link href={`/doctor/messages?c=${x.a.id}`} aria-current={x.a.id === current?.a.id ? "page" : undefined} className={cn("tap block p-3 hover:bg-surface-2", x.a.id === current?.a.id && "bg-primary-soft")}>
                  <span className="flex items-center gap-2">
                    <span className="font-semibold">{x.patientName}</span>
                    {x.needsReply ? <Badge tone="accent" className="ms-auto">{t("Needs reply")}</Badge> : null}
                  </span>
                  <span className="line-clamp-1 text-sm text-fg-muted">{x.last?.body ?? t("No messages yet")}</span>
                  <span className="text-xs text-fg-muted">{t("Open until {date}", { date: fmt.date(x.a.followUpChatUntil!) })}</span>
                </Link>
              </li>
            ))}
          </ul>
          {current ? (
            <section className="space-y-2" aria-labelledby="thread">
              <div className="flex flex-wrap items-center gap-2">
                <Link href="/doctor/messages" className="tap inline-flex items-center text-primary underline lg:hidden">{t("All chats")}</Link>
                <h2 id="thread" className="text-lg font-bold">{current.patientName} · {current.a.ref}</h2>
              </div>
              <FollowUpChat
                key={current.a.id}
                apptId={current.a.id}
                open
                note={t("Reply in plain words. Don't prescribe new medicines in chat; book a follow-up consult instead.")}
                closedText={t("Chat is closed.")}
                initial={thread.map((m) => ({ id: m.id, senderRole: m.senderRole, senderName: m.senderName, body: m.body, documentId: m.documentId, kind: m.kind, createdAt: m.createdAt.toISOString(), mine: m.senderUserId === user!.id }))}
              />
            </section>
          ) : (
            <p className="hidden self-center text-center text-fg-muted lg:block">{t("Choose a chat to read and reply.")}</p>
          )}
        </div>
      ) : (
        <EmptyState icon={<MessageSquare className="size-8" aria-hidden />} title={t("No open chats")}>{t("Follow-up chats appear here after your consults.")}</EmptyState>
      )}
    </div>
  );
}
