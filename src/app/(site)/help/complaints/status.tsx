import type { complaints } from "@/db/schema";
import type { ViewContext } from "@/server/context";
import { Badge } from "@/components/ui/badge";
import { humanize } from "@/lib/utils";

export function ComplaintStatus({ c, ctx }: { c: typeof complaints.$inferSelect; ctx: ViewContext }) {
  const { t, fmt } = ctx;
  const done = c.status === "resolved" || c.status === "closed";
  return (
    <section className="card space-y-3 p-5">
      <div className="flex flex-wrap items-center gap-2"><strong>{c.ref}</strong> · {c.subject}<Badge tone={done ? "success" : "warning"} className="ms-auto">{t(humanize(c.status))}</Badge></div>
      <p className="text-sm text-fg-muted">{t("Received {date}. Resolution due by {due}.", { date: fmt.dateTime(c.createdAt), due: fmt.date(c.resolveBy) })}</p>
      <ol className="space-y-2 border-s-2 border-line ps-3">
        {c.updates.filter((u) => u.public).map((u, i) => <li key={i}><p className="text-sm text-fg-muted">{fmt.dateTime(u.at)}</p><p>{u.note}</p></li>)}
      </ol>
      {c.resolution ? <p><strong>{t("Resolution:")}</strong> {c.resolution}</p> : null}
    </section>
  );
}
