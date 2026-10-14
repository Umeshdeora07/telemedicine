import type { Metadata } from "next";
import Link from "next/link";
import { Bell } from "lucide-react";
import { getDb } from "@/db";
import { getViewContext } from "@/server/context";
import { myNotifications } from "@/server/patient";
import { markAllRead } from "@/server/notify";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const ctx = await getViewContext();
  const { t, fmt, user } = ctx;
  const rows = await myNotifications(user!.id, 100);
  // Opening the list marks everything as read (after we've captured which were new).
  await markAllRead(await getDb(), user!.id);
  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title={t("Notifications")} description={t("Reminders and updates. You also get them by SMS, WhatsApp (if you turned it on) and email.")} />
      {rows.length ? (
        <ul className="card divide-y divide-line">
          {rows.map((n) => {
            const body = (
              <>
                <span className="flex items-start gap-2">
                  {!n.readAt ? <span className="mt-2 size-2 shrink-0 rounded-full bg-accent" aria-label={t("New")} /> : <span className="size-2 shrink-0" aria-hidden />}
                  <span className="min-w-0">
                    <span className={cn("block", !n.readAt && "font-semibold")}>{n.title}</span>
                    <span className="block text-fg-muted">{n.body}</span>
                    <span className="block text-sm text-fg-muted">{n.sentAt ? fmt.dateTime(n.sentAt) : ""}</span>
                  </span>
                </span>
              </>
            );
            return <li key={n.id}>{n.link ? <Link href={n.link} className="block p-4 hover:bg-surface-2">{body}</Link> : <div className="p-4">{body}</div>}</li>;
          })}
        </ul>
      ) : (
        <EmptyState icon={<Bell className="size-8" aria-hidden />} title={t("No notifications yet")} />
      )}
    </div>
  );
}
