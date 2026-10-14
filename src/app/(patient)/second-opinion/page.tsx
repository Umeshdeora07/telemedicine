import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { FileSearch } from "lucide-react";
import { getDb } from "@/db";
import { doctors, secondOpinions, specialties } from "@/db/schema";
import { getViewContext } from "@/server/context";
import { myPatientIds, myPeople } from "@/server/patient";
import { SECOND_OPINION_FEE_INR } from "@/server/second-opinion";
import { convertFromInr } from "@/lib/pricing";
import { getDeclaredLocation } from "@/lib/prefs";
import type { Currency } from "@/config/currencies";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { SecondOpinionRequestForm } from "@/components/patient/second-opinion-form";

export const metadata: Metadata = { title: "Second opinion" };

const STATUS: Record<string, [string, "warning" | "primary" | "success" | "neutral"]> = { pending_payment: ["Waiting for payment", "warning"], submitted: ["Finding a specialist", "primary"], assigned: ["With the specialist", "primary"], answered: ["Opinion ready", "success"], cancelled: ["Cancelled", "neutral"] };

export default async function SecondOpinionPage() {
  const ctx = await getViewContext();
  const { t, fmt, user, currency, rate } = ctx;
  const db = await getDb();
  const ids = await myPatientIds(user!.id, "records");
  const [mine, people, specs, loc] = await Promise.all([
    ids.length ? db.select().from(secondOpinions).where(inArray(secondOpinions.patientId, ids)).orderBy(desc(secondOpinions.createdAt)) : [],
    myPeople(user!.id),
    db.selectDistinct({ slug: specialties.slug, name: specialties.name }).from(doctors).innerJoin(specialties, eq(specialties.id, doctors.specialtyId)).where(and(eq(doctors.offersSecondOpinion, true), eq(doctors.verificationStatus, "approved"), sql`true`)),
    getDeclaredLocation(),
  ]);
  const fee = fmt.money(convertFromInr(SECOND_OPINION_FEE_INR, currency as Currency, rate), currency);
  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title={t("Get a second opinion")} description={t("A senior specialist reviews your reports and writes a clear opinion within 48 hours — before surgery, a big treatment, or when you're unsure.")} />
      {mine.length ? (
        <section className="space-y-2" aria-labelledby="mine">
          <h2 id="mine" className="text-lg font-bold">{t("Your requests")}</h2>
          <ul className="card divide-y divide-line">
            {mine.map((s) => (
              <li key={s.id}>
                <Link href={`/second-opinion/${s.id}`} className="flex flex-wrap items-center gap-2 p-3 hover:bg-surface-2">
                  <FileSearch className="size-4 text-primary" aria-hidden />
                  <span className="min-w-0 flex-1 truncate">{s.question}</span>
                  <span className="text-sm text-fg-muted">{fmt.date(s.createdAt)}</span>
                  <Badge tone={STATUS[s.status]?.[1] ?? "neutral"}>{t(STATUS[s.status]?.[0] ?? s.status)}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <section className="card space-y-4 p-5" aria-labelledby="new">
        <h2 id="new" className="text-lg font-bold">{t("New request · {fee}", { fee })}</h2>
        <SecondOpinionRequestForm people={people.filter((p) => !p.link || (p.link.status === "active" && p.link.canBook)).map((p) => ({ id: p.patient.id, name: p.patient.fullName }))} specialties={specs} fee={fee} country={loc?.country ?? "IN"} region={loc?.region ?? null} />
      </section>
    </div>
  );
}
