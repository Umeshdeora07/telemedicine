import type { MetadataRoute } from "next";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { articles, clinics, conditions, doctors, specialties } from "@/db/schema";
import { env } from "@/config/env";
import { LEGAL } from "@/content/legal";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const db = await getDb();
  const [specs, conds, docs, hosp, arts] = await Promise.all([
    db.select({ slug: specialties.slug }).from(specialties),
    db.select({ slug: conditions.slug, at: conditions.reviewedAt }).from(conditions),
    db.select({ slug: doctors.slug, at: doctors.updatedAt }).from(doctors).where(eq(doctors.verificationStatus, "approved")),
    db.select({ slug: clinics.slug }).from(clinics).where(eq(clinics.verificationStatus, "approved")),
    db.select({ slug: articles.slug, at: articles.updatedAt }).from(articles).where(eq(articles.published, true)),
  ]);
  const u = (p: string) => `${env.appUrl}${p}`;
  const fixed = ["/", "/doctors", "/specialties", "/hospitals", "/international", "/how-it-works", "/pricing", "/for-doctors", "/for-clinics", "/health-library", "/about", "/contact", "/help", "/emergency", "/triage", "/second-opinion"];
  return [
    ...fixed.map((p) => ({ url: u(p), changeFrequency: "weekly" as const, priority: p === "/" ? 1 : 0.7 })),
    ...specs.map((s) => ({ url: u(`/specialties/${s.slug}`), changeFrequency: "monthly" as const, priority: 0.8 })),
    ...conds.map((c) => ({ url: u(`/conditions/${c.slug}`), lastModified: c.at ?? undefined, changeFrequency: "monthly" as const })),
    ...docs.map((d) => ({ url: u(`/doctors/${d.slug}`), lastModified: d.at, changeFrequency: "weekly" as const, priority: 0.6 })),
    ...hosp.map((h) => ({ url: u(`/hospitals/${h.slug}`), changeFrequency: "monthly" as const })),
    ...arts.map((a) => ({ url: u(`/health-library/${a.slug}`), lastModified: a.at, changeFrequency: "monthly" as const })),
    ...Object.keys(LEGAL).map((k) => ({ url: u(`/legal/${k}`), changeFrequency: "yearly" as const, priority: 0.2 })),
  ];
}
