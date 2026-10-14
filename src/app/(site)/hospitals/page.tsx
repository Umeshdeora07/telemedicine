import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { Globe, MapPin, ShieldCheck, Siren } from "lucide-react";
import { getDb } from "@/db";
import { clinics } from "@/db/schema";
import { getViewContext } from "@/server/context";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { LazyMap } from "@/components/map/lazy-map";

export const metadata: Metadata = { title: "Hospitals and clinics", description: "Partner hospitals and clinics for in-person visits, tests and treatment." };

export default async function HospitalsPage() {
  const ctx = await getViewContext();
  const { t } = ctx;
  const list = await (await getDb()).select().from(clinics).where(eq(clinics.verificationStatus, "approved")).orderBy(asc(clinics.name));
  return (
    <div className="container-page space-y-8 py-8">
      <PageHeader title={t("Hospitals and clinics")} description={t("Verified partner hospitals and clinics for examinations, tests and treatment. Book a clinic visit with the same doctor you saw online.")} />
      <LazyMap label={t("Map of partner hospitals and clinics")} height={360} points={list.filter((c) => c.lat && c.lng).map((c) => ({ lat: c.lat!, lng: c.lng!, title: c.name, subtitle: `${c.city}, ${c.state}`, href: `/hospitals/${c.slug}` }))} />
      <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {list.map((c) => (
          <li key={c.id}>
            <Link href={`/hospitals/${c.slug}`} className="card flex h-full flex-col overflow-hidden hover:border-primary">
              {c.photos[0] ? <Image src={c.photos[0].url} alt={c.photos[0].alt} width={640} height={320} className="aspect-[2/1] w-full object-cover" unoptimized /> : null}
              <span className="flex flex-1 flex-col gap-2 p-5">
                <span className="text-lg font-bold text-heading">{c.name}</span>
                <span className="flex items-center gap-1.5 text-fg-muted"><MapPin className="size-4" aria-hidden />{c.city}, {c.state}</span>
                <span className="flex flex-wrap gap-1.5">
                  {c.accreditations.map((a) => <Badge key={a} tone="success"><ShieldCheck className="size-3.5" aria-hidden />{a}</Badge>)}
                  {c.acceptsInternational ? <Badge tone="primary"><Globe className="size-3.5" aria-hidden />{t("International patients")}</Badge> : null}
                  {c.emergency24x7 ? <Badge tone="danger"><Siren className="size-3.5" aria-hidden />{t("24×7 emergency")}</Badge> : null}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
