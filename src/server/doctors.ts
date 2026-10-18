import "server-only";
import { and, asc, desc, eq, gt, inArray, sql, type SQL } from "drizzle-orm";
import { getDb, type Executor } from "@/db";
import {
  availabilitySlots,
  clinics,
  doctorClinicLinks,
  doctorFees,
  doctorLicences,
  doctorQualifications,
  doctors,
  reviews,
  specialties,
} from "@/db/schema";

/** Kept on bookings as the consult jurisdiction. It is always India (see server/location.ts). */
export type PatientLocation = { country: string; region: string | null };

/**
 * THE core safety rule: a doctor is listed (and can be booked) only if they
 * are approved, their 12 month re-verification is not overdue, and they hold
 * a verified, unexpired Indian registration (National Medical Commission, a
 * State Medical Council, or the Rehabilitation Council of India for clinical
 * psychologists). Every consult is given under India's telemedicine rules,
 * wherever the patient lives, so a registration from another country never
 * makes a doctor visible.
 */
export const visibleDoctor: SQL = sql`(
  ${doctors.verificationStatus} = 'approved'
  and ${doctors.reverifyDueAt} is not null and ${doctors.reverifyDueAt} > now()
  and exists (
    select 1 from ${doctorLicences} l
    where l.doctor_id = ${doctors.id}
      and l.status = 'verified'
      and (l.expires_at is null or l.expires_at >= current_date)
      and l.country = 'IN'
  )
)`;

/**
 * Same rule as visibleDoctor. The location argument is accepted for older
 * callers and ignored: the patient's whereabouts never change who may consult.
 */
export function visibleForLocation(_loc?: PatientLocation): SQL {
  return visibleDoctor;
}

/** Public profile pages use the same rule as listings. */
export const listableAnywhere = visibleDoctor;

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
  clinic?: string;
  instantOnly?: boolean;
  sort?: "soonest" | "rating" | "fee" | "experience";
  limit?: number;
};

/** Visible doctors matching the filters. The location argument is ignored (see visibleForLocation). */
export async function listDoctors(_loc: PatientLocation | null, f: DoctorFilters = {}) {
  const db = await getDb();
  const conds: SQL[] = [visibleDoctor];
  if (f.specialty) conds.push(eq(specialties.slug, f.specialty));
  if (f.language) conds.push(sql`${f.language} = any(${doctors.languages})`);
  if (f.gender) conds.push(eq(doctors.gender, f.gender));
  if (f.minRating) conds.push(sql`${doctors.ratingAvg} >= ${f.minRating}`);
  if (f.minExperience) conds.push(sql`${doctors.experienceYears} >= ${f.minExperience}`);
  if (f.instantOnly) conds.push(eq(doctors.acceptsInstant, true));
  if (f.mode === "in_clinic") conds.push(sql`'in_clinic' = any(${doctors.modes})`);
  if (f.mode === "online") conds.push(sql`${doctors.modes} && array['video','audio','chat']::consult_mode[]`);
  if (f.mode === "both") conds.push(sql`'in_clinic' = any(${doctors.modes}) and ${doctors.modes} && array['video','audio','chat']::consult_mode[]`);
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

/** True when the doctor may be booked right now (approved, re-verified and holding a valid Indian registration). */
export async function isDoctorVisible(db: Executor, doctorId: string, _loc?: PatientLocation) {
  const [r] = await db.select({ id: doctors.id }).from(doctors).where(and(eq(doctors.id, doctorId), visibleDoctor));
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

/** Featured doctors for the home page: highest rated. */
export async function featuredDoctors(limit = 6) {
  return (await listDoctors(null, { sort: "rating", limit: 30 }))
    .filter((d) => Number(d.ratingCount) >= 3)
    .slice(0, limit);
}
