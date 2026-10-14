import "server-only";
import { and, asc, desc, eq, gt, inArray, sql, type SQL } from "drizzle-orm";
import { getDb, rows, type Executor } from "@/db";
import {
  availabilitySlots,
  clinics,
  countries,
  doctorClinicLinks,
  doctorFees,
  doctorLicences,
  doctorQualifications,
  doctors,
  reviews,
  specialties,
} from "@/db/schema";

export type PatientLocation = { country: string; region: string | null };

/**
 * THE core safety rule: a doctor is shown (and can be booked) for a patient
 * location only if the doctor is approved, their 12-month re-verification is
 * not overdue, the country is switched on for consults, and they hold a
 * verified, unexpired licence for that country — and for that state/province
 * where licensing is regional (e.g. the USA).
 */
export function visibleForLocation(loc: PatientLocation): SQL {
  return sql`(
    ${doctors.verificationStatus} = 'approved'
    and ${doctors.reverifyDueAt} is not null and ${doctors.reverifyDueAt} > now()
    and exists (
      select 1 from ${countries} c
      where c.code = ${loc.country} and c.local_consults_enabled
        and (c.licence_scope = 'country' or ${loc.region ?? ""} <> '')
    )
    and exists (
      select 1 from ${doctorLicences} l
      where l.doctor_id = ${doctors.id}
        and l.status = 'verified'
        and (l.expires_at is null or l.expires_at >= current_date)
        and l.country = ${loc.country}
        and (
          (select licence_scope from ${countries} where code = ${loc.country}) = 'country'
          or l.region = ${loc.region ?? ""}
        )
    )
  )`;
}

/** Approved and holding at least one valid licence somewhere (for public profile pages). */
export const listableAnywhere = sql`(
  ${doctors.verificationStatus} = 'approved'
  and ${doctors.reverifyDueAt} is not null and ${doctors.reverifyDueAt} > now()
  and exists (
    select 1 from ${doctorLicences} l
    where l.doctor_id = ${doctors.id} and l.status = 'verified' and (l.expires_at is null or l.expires_at >= current_date)
  )
)`;

const nextSlotSql = (group: "online" | "in_clinic") => sql<Date | null>`(
  select min(s.start_at) from ${availabilitySlots} s
  where s.doctor_id = ${doctors.id} and s."group" = ${group}
    and s.start_at > now() + interval '5 minutes'
    and (s.status = 'open' or (s.status = 'held' and s.held_until < now()))
)`;

export type DoctorFilters = {
  q?: string;
  specialty?: string;
  language?: string;
  gender?: "female" | "male";
  maxFeeInrMinor?: number;
  minRating?: number;
  minExperience?: number;
  availableToday?: { start: Date; end: Date };
  mode?: "online" | "in_clinic" | "both";
  licenceCountry?: string;
  clinic?: string;
  instantOnly?: boolean;
  secondOpinion?: boolean;
  sort?: "soonest" | "rating" | "fee" | "experience";
  limit?: number;
};

export async function listDoctors(loc: PatientLocation, f: DoctorFilters = {}) {
  const db = await getDb();
  const conds: SQL[] = [visibleForLocation(loc)];
  if (f.specialty) conds.push(eq(specialties.slug, f.specialty));
  if (f.language) conds.push(sql`${f.language} = any(${doctors.languages})`);
  if (f.gender) conds.push(eq(doctors.gender, f.gender));
  if (f.minRating) conds.push(sql`${doctors.ratingAvg} >= ${f.minRating}`);
  if (f.minExperience) conds.push(sql`${doctors.experienceYears} >= ${f.minExperience}`);
  if (f.instantOnly) conds.push(eq(doctors.acceptsInstant, true));
  if (f.secondOpinion) conds.push(eq(doctors.offersSecondOpinion, true));
  if (f.mode === "in_clinic") conds.push(sql`'in_clinic' = any(${doctors.modes})`);
  if (f.mode === "online") conds.push(sql`${doctors.modes} && array['video','audio','chat']::consult_mode[]`);
  if (f.mode === "both") conds.push(sql`'in_clinic' = any(${doctors.modes}) and ${doctors.modes} && array['video','audio','chat']::consult_mode[]`);
  if (f.licenceCountry)
    conds.push(sql`exists (select 1 from ${doctorLicences} l where l.doctor_id = ${doctors.id} and l.status = 'verified' and l.country = ${f.licenceCountry} and (l.expires_at is null or l.expires_at >= current_date))`);
  if (f.clinic)
    conds.push(sql`exists (select 1 from ${doctorClinicLinks} dl join ${clinics} c on c.id = dl.clinic_id where dl.doctor_id = ${doctors.id} and dl.active and c.slug = ${f.clinic})`);
  if (f.maxFeeInrMinor)
    conds.push(sql`exists (select 1 from ${doctorFees} fe where fe.doctor_id = ${doctors.id} and fe.currency = 'INR' and fe.amount_minor <= ${f.maxFeeInrMinor})`);
  if (f.availableToday)
    conds.push(sql`exists (
      select 1 from ${availabilitySlots} s where s.doctor_id = ${doctors.id}
        and s.start_at >= greatest(${f.availableToday.start.toISOString()}::timestamptz, now() + interval '5 minutes')
        and s.start_at < ${f.availableToday.end.toISOString()}::timestamptz
        and (s.status = 'open' or (s.status = 'held' and s.held_until < now()))
    )`);
  if (f.q?.trim()) {
    const like = `%${f.q.trim().toLowerCase()}%`;
    conds.push(sql`(
      lower(${doctors.fullName}) like ${like}
      or lower(${doctors.headline}) like ${like}
      or lower(${specialties.name}) like ${like}
      or lower(array_to_string(${doctors.subSpecialties}, ' ')) like ${like}
      or lower(array_to_string(${doctors.conditionsTreated}, ' ')) like ${like}
      or lower(array_to_string(${doctors.procedures}, ' ')) like ${like}
      or lower(array_to_string(${specialties.symptoms}, ' ')) like ${like}
      or lower(array_to_string(${specialties.treats}, ' ')) like ${like}
      or lower(coalesce(${clinics.name}, '')) like ${like}
    )`);
  }
  const nextOnline = nextSlotSql("online");
  const nextClinic = nextSlotSql("in_clinic");
  const minFee = sql<number>`(select min(amount_minor) from ${doctorFees} fe where fe.doctor_id = ${doctors.id} and fe.currency = 'INR' and fe.mode <> 'in_clinic')`;
  const order =
    f.sort === "rating"
      ? [desc(doctors.ratingAvg), desc(doctors.ratingCount)]
      : f.sort === "fee"
        ? [asc(minFee)]
        : f.sort === "experience"
          ? [desc(doctors.experienceYears)]
          : f.mode === "in_clinic"
            ? [sql`${nextClinic} asc nulls last`]
            : [sql`${nextOnline} asc nulls last`, desc(doctors.ratingAvg)];

  const result = await db
    .select({
      id: doctors.id,
      slug: doctors.slug,
      fullName: doctors.fullName,
      gender: doctors.gender,
      photoUrl: doctors.photoUrl,
      avatarSeed: doctors.avatarSeed,
      languages: doctors.languages,
      experienceYears: doctors.experienceYears,
      headline: doctors.headline,
      ratingAvg: doctors.ratingAvg,
      ratingCount: doctors.ratingCount,
      modes: doctors.modes,
      acceptsInstant: doctors.acceptsInstant,
      lastVerifiedAt: doctors.lastVerifiedAt,
      chatResponseMinutes: doctors.chatResponseMinutes,
      specialtyName: specialties.name,
      specialtySlug: specialties.slug,
      clinicName: clinics.name,
      clinicCity: clinics.city,
      clinicSlug: clinics.slug,
      clinicLat: clinics.lat,
      clinicLng: clinics.lng,
      nextOnline,
      nextClinic,
    })
    .from(doctors)
    .innerJoin(specialties, eq(specialties.id, doctors.specialtyId))
    .leftJoin(clinics, eq(clinics.id, doctors.primaryClinicId))
    .where(and(...conds))
    .orderBy(...order)
    .limit(f.limit ?? 60);

  const fees = result.length
    ? await db.select().from(doctorFees).where(inArray(doctorFees.doctorId, result.map((r) => r.id)))
    : [];
  return result.map((r) => ({
    ...r,
    nextOnline: r.nextOnline ? new Date(r.nextOnline) : null,
    nextClinic: r.nextClinic ? new Date(r.nextClinic) : null,
    fees: fees.filter((f) => f.doctorId === r.id),
  }));
}

export type DoctorListItem = Awaited<ReturnType<typeof listDoctors>>[number];

/** True when the doctor may consult a patient at this location right now. */
export async function isDoctorVisible(db: Executor, doctorId: string, loc: PatientLocation) {
  const [r] = await db.select({ id: doctors.id }).from(doctors).where(and(eq(doctors.id, doctorId), visibleForLocation(loc)));
  return Boolean(r);
}

export async function getDoctorProfile(slug: string) {
  const db = await getDb();
  const [d] = await db
    .select({ doctor: doctors, specialty: specialties })
    .from(doctors)
    .innerJoin(specialties, eq(specialties.id, doctors.specialtyId))
    .where(and(eq(doctors.slug, slug), listableAnywhere));
  if (!d) return null;
  const [quals, licences, fees, clinicLinks, reviewRows] = await Promise.all([
    db.select().from(doctorQualifications).where(eq(doctorQualifications.doctorId, d.doctor.id)).orderBy(asc(doctorQualifications.year)),
    db
      .select()
      .from(doctorLicences)
      .where(and(eq(doctorLicences.doctorId, d.doctor.id), eq(doctorLicences.status, "verified"), sql`(${doctorLicences.expiresAt} is null or ${doctorLicences.expiresAt} >= current_date)`)),
    db.select().from(doctorFees).where(eq(doctorFees.doctorId, d.doctor.id)),
    db
      .select({ link: doctorClinicLinks, clinic: clinics })
      .from(doctorClinicLinks)
      .innerJoin(clinics, eq(clinics.id, doctorClinicLinks.clinicId))
      .where(and(eq(doctorClinicLinks.doctorId, d.doctor.id), eq(doctorClinicLinks.active, true), eq(clinics.verificationStatus, "approved"))),
    db
      .select()
      .from(reviews)
      .where(and(eq(reviews.doctorId, d.doctor.id), eq(reviews.status, "published")))
      .orderBy(desc(reviews.createdAt))
      .limit(20),
  ]);
  return { ...d, quals, licences, fees, clinics: clinicLinks, reviews: reviewRows };
}

export async function getOpenSlots(db: Executor, doctorId: string, group: "online" | "in_clinic", opts: { from?: Date; days?: number; clinicId?: string | null } = {}) {
  const from = opts.from ?? new Date(Date.now() + 5 * 60_000);
  const to = new Date(from.getTime() + (opts.days ?? 14) * 86400_000);
  return db
    .select({ id: availabilitySlots.id, startAt: availabilitySlots.startAt, endAt: availabilitySlots.endAt, clinicId: availabilitySlots.clinicId, timeZone: availabilitySlots.timeZone })
    .from(availabilitySlots)
    .where(
      and(
        eq(availabilitySlots.doctorId, doctorId),
        eq(availabilitySlots.group, group),
        gt(availabilitySlots.startAt, from),
        sql`${availabilitySlots.startAt} < ${to.toISOString()}::timestamptz`,
        sql`(${availabilitySlots.status} = 'open' or (${availabilitySlots.status} = 'held' and ${availabilitySlots.heldUntil} < now()))`,
        opts.clinicId ? eq(availabilitySlots.clinicId, opts.clinicId) : undefined,
      ),
    )
    .orderBy(asc(availabilitySlots.startAt));
}

/** Featured doctors for the home page: highest rated, visible in India. */
export async function featuredDoctors(limit = 6) {
  return (await listDoctors({ country: "IN", region: null }, { sort: "rating", limit: 30 }))
    .filter((d) => Number(d.ratingCount) >= 3)
    .slice(0, limit);
}

/** Countries where at least one verified doctor can consult (for "Consult a doctor licensed in your country"). */
export async function locationsWithDoctors() {
  const db = await getDb();
  return rows<{ country: string; region: string | null; n: number }>(
    await db.execute(sql`
      select l.country, l.region, count(distinct l.doctor_id)::int as n
      from ${doctorLicences} l join ${doctors} d on d.id = l.doctor_id
      join ${countries} c on c.code = l.country and c.local_consults_enabled
      where l.status = 'verified' and (l.expires_at is null or l.expires_at >= current_date)
        and d.verification_status = 'approved' and d.reverify_due_at > now()
      group by l.country, l.region order by l.country
    `),
  );
}
