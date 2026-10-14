import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { Clock, Globe, MapPin, Navigation, Phone, ShieldCheck, Siren } from "lucide-react";
import { getDb } from "@/db";
import { clinics, doctorClinicLinks, doctors, specialties } from "@/db/schema";
import { getViewContext } from "@/server/context";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { DoctorAvatar } from "@/components/ui/avatar";
import { LazyMap } from "@/components/map/lazy-map";
import { JsonLd } from "@/components/common/json-ld";
import { SPOKEN_LANGUAGES } from "@/config/languages";

async function load(slug: string) {
  const [c] = await (await getDb()).select().from(clinics).where(and(eq(clinics.slug, slug), eq(clinics.verificationStatus, "approved")));
  return c ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const c = await load((await params).slug);
  return c ? { title: `${c.name}, ${c.city}`, description: c.about.slice(0, 160) } : {};
}

export default async function HospitalPage({ params }: { params: Promise<{ slug: string }> }) {
  const c = await load((await params).slug);
  if (!c) notFound();
  const ctx = await getViewContext();
  const { t, fmt } = ctx;
  const docs = await (await getDb())
    .select({ d: doctors, specialty: specialties.name, fee: doctorClinicLinks.inClinicFeeMinor, role: doctorClinicLinks.role })
    .from(doctorClinicLinks)
    .innerJoin(doctors, eq(doctors.id, doctorClinicLinks.doctorId))
    .innerJoin(specialties, eq(specialties.id, doctors.specialtyId))
    .where(and(eq(doctorClinicLinks.clinicId, c.id), eq(doctorClinicLinks.active, true), eq(doctors.verificationStatus, "approved")))
    .orderBy(asc(specialties.sortOrder), asc(doctors.fullName));
  const dirs = c.lat && c.lng ? `https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${c.name} ${c.city}`)}`;
  return (
    <div className="container-page space-y-8 py-8">
      <JsonLd data={{ "@context": "https://schema.org", "@type": c.kind === "hospital" ? "Hospital" : "MedicalClinic", name: c.name, address: { "@type": "PostalAddress", streetAddress: c.addressLine, addressLocality: c.city, addressRegion: c.state, postalCode: c.postcode, addressCountry: c.country }, telephone: c.phone, geo: c.lat ? { "@type": "GeoCoordinates", latitude: c.lat, longitude: c.lng } : undefined }} />
      <nav aria-label={t("Breadcrumb")} className="text-sm text-fg-muted"><Link href="/hospitals" className="hover:underline">{t("Hospitals")}</Link> › {c.name}</nav>
      <PageHeader title={c.name} description={<span className="flex items-center gap-1.5"><MapPin className="size-4" aria-hidden />{c.addressLine}, {c.city}, {c.state} {c.postcode}</span>} />
      {c.photos.length ? (
        <div className="grid gap-3 sm:grid-cols-2">{c.photos.slice(0, 2).map((p) => <img key={p.url} src={p.url} alt={p.alt} width={800} height={400} className="aspect-[2/1] w-full rounded-2xl object-cover" />)}</div>
      ) : null}
      <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <p className="text-lg">{c.about}</p>
          <div className="flex flex-wrap gap-1.5">
            {c.accreditations.map((a) => <Badge key={a} tone="success"><ShieldCheck className="size-3.5" aria-hidden />{a}</Badge>)}
            {c.emergency24x7 ? <Badge tone="danger"><Siren className="size-3.5" aria-hidden />{t("24×7 emergency")}</Badge> : null}
          </div>
          {c.facilities.length ? <section className="space-y-2"><h2 className="text-xl font-bold">{t("Facilities")}</h2><ul className="grid gap-1 sm:grid-cols-2">{c.facilities.map((f) => <li key={f} className="flex gap-2">• {t(f)}</li>)}</ul></section> : null}
          <section className="space-y-3" aria-labelledby="docs">
            <h2 id="docs" className="text-xl font-bold">{t("Doctors here ({n})", { n: docs.length })}</h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {docs.map(({ d, specialty, fee }) => (
                <li key={d.id} className="card flex items-center gap-3 p-4">
                  <DoctorAvatar name={d.fullName} seed={d.avatarSeed} gender={d.gender} photoUrl={d.photoUrl} size={52} senior={d.experienceYears >= 20} />
                  <span className="min-w-0 flex-1">
                    <Link href={`/doctors/${d.slug}`} className="font-semibold hover:underline">{d.fullName}</Link>
                    <span className="block text-sm text-fg-muted">{t(specialty)} · {fee ? t("Clinic fee {fee}", { fee: fmt.money(fee, "INR") }) : ""}</span>
                  </span>
                  <ButtonLink href={`/book/${d.slug}?mode=in_clinic`} size="sm" variant="secondary">{t("Book visit")}</ButtonLink>
                </li>
              ))}
            </ul>
          </section>
        </div>
        <aside className="space-y-4">
          <div className="card space-y-3 p-5">
            {c.phone ? <a href={`tel:${c.phone}`} className="flex items-center gap-2 font-semibold text-primary"><Phone className="size-4" aria-hidden />{c.phone}</a> : null}
            <a href={dirs} target="_blank" rel="noopener" className="flex items-center gap-2 font-semibold text-primary"><Navigation className="size-4" aria-hidden />{t("Get directions")}</a>
            {c.timings.length ? (
              <div>
                <p className="flex items-center gap-2 font-semibold"><Clock className="size-4" aria-hidden />{t("Opening hours")}</p>
                <ul className="mt-1 text-sm">{c.timings.map((x) => <li key={x.day} className="flex justify-between gap-4"><span>{t(x.day)}</span><span className="tabular-nums">{x.open}–{x.close}</span></li>)}</ul>
              </div>
            ) : null}
          </div>
          {c.acceptsInternational && c.internationalDesk ? (
            <div className="card space-y-2 p-5">
              <p className="flex items-center gap-2 font-semibold"><Globe className="size-4 text-primary" aria-hidden />{t("International patient desk")}</p>
              {c.internationalDesk.phone ? <p><a href={`tel:${c.internationalDesk.phone}`} className="text-primary underline">{c.internationalDesk.phone}</a></p> : null}
              {c.internationalDesk.languages?.length ? <p className="text-sm text-fg-muted">{t("Languages: {list}", { list: c.internationalDesk.languages.map((l) => t(SPOKEN_LANGUAGES[l as keyof typeof SPOKEN_LANGUAGES] ?? l)).join(", ") })}</p> : null}
              <ButtonLink href="/international/new" variant="secondary" size="sm">{t("Plan treatment here")}</ButtonLink>
            </div>
          ) : null}
          {c.lat && c.lng ? <LazyMap label={t("Map showing {name}", { name: c.name })} height={240} points={[{ lat: c.lat, lng: c.lng, title: c.name, subtitle: c.city, highlight: true }]} /> : null}
        </aside>
      </div>
    </div>
  );
}
