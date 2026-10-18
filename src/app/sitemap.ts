import type { MetadataRoute } from "next";
import { getDb } from "@/db";
import { doctors } from "@/db/schema";
import { env } from "@/config/env";
import { LEGAL } from "@/content/legal";
import { visibleDoctor } from "@/server/doctors";

export const dynamic = "force-dynamic";

/** The four specialties, in the order they are shown. */
const SPECIALTY_SLUGS = ["orthopaedics", "dermatology", "general-physician", "psychology"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const db = await getDb();
  const docs = await db.select({ slug: doctors.slug, at: doctors.updatedAt }).from(doctors).where(visibleDoctor);
  const u = (p: string) => `${env.appUrl}${p}`;
  const main = ["/", "/online-consultation", "/treatment-in-india", "/doctors", "/specialties"];
  const other = ["/about", "/contact", "/help", "/for-doctors"];
  return [
    ...main.map((p) => ({ url: u(p), changeFrequency: "weekly" as const, priority: p === "/" ? 1 : 0.9 })),
    ...other.map((p) => ({ url: u(p), changeFrequency: "monthly" as const, priority: 0.5 })),
    ...SPECIALTY_SLUGS.map((s) => ({ url: u(`/specialties/${s}`), changeFrequency: "monthly" as const, priority: 0.8 })),
    ...docs.map((d) => ({ url: u(`/doctors/${d.slug}`), lastModified: d.at, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...Object.keys(LEGAL).map((k) => ({ url: u(`/legal/${k}`), changeFrequency: "yearly" as const, priority: 0.2 })),
  ];
}
