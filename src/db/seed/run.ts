/**
 * Demo data: 20 verified doctors across 8 specialties (plus 3 hidden test
 * doctors), 3 clinics, 10 patient accounts with family members, and one
 * international case, with realistic consults, prescriptions, payments and
 * reviews around "now".
 */
import { and, eq, gt, sql } from "drizzle-orm";
import type { DB } from "@/db";
import * as s from "@/db/schema";
import { brand } from "@/config/brand";
import { encryptText, keyedHash, shortCode } from "@/lib/crypto";
import { financialYear, refs } from "@/lib/ids";
import { materializeSlots } from "@/lib/slots";
import { addDays, addMinutes, dayInZone, zonedTimeToUtc } from "@/lib/time";
import { signRx, type RxSnapshot } from "@/lib/rx";
import { FREQUENCIES } from "@/lib/tpg";
import { saveFile } from "@/lib/storage";
import { simplePdf } from "@/lib/pdf/simple";
import { ageFrom } from "@/lib/utils";
import { COUNTRIES, DEMO_FX } from "./data/countries";
import { SPECIALTIES, CONDITIONS } from "./data/specialties";
import { CLINICS } from "./data/clinics";
import { DOCTORS, type DoctorSeed } from "./data/doctors";
import { MEDICINES } from "./data/medicines";
import { ACCOUNTS, INTERPRETERS, PLANS, REVIEW_TEXTS, STAFF } from "./data/people";
import { ARTICLES } from "./data/articles";

export const DEMO_TOTP_SECRET = "JBSWY3DPEHPK3PXP";

function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const IST = "Asia/Kolkata";
const PLATFORM_FEE = 2500;
const GST = 450;

let invoiceSeq = 1000;
const invoiceNo = (d: Date) => `INV/${financialYear(d)}/${String(++invoiceSeq).padStart(6, "0")}`;

export async function seedDemo(db: DB, now = new Date()) {
  const random = rng(20261014);
  const pick = <T,>(arr: readonly T[]) => arr[Math.floor(random() * arr.length)]!;
  const today = dayInZone(now, IST);
  const daysAgo = (n: number, time = "11:00") => zonedTimeToUtc(addDays(today, -n), time, IST);

  /* ------------------------------------------------------------ reference */
  await db.insert(s.countries).values(
    COUNTRIES.map((c) => ({ ...c, consentText: null })),
  );
  const asOf = today;
  await db.insert(s.exchangeRates).values(
    Object.entries(DEMO_FX)
      .filter(([q]) => q !== "INR")
      .map(([quote, rate]) => ({ base: "INR", quote, rate, asOf, source: "demo" })),
  );
  await db.insert(s.settings).values([
    { key: "refund_policy", value: { doctorNoShowMinutes: 10, patientCancelFullRefundHours: 4, patientCancelPartialRefundPercent: 50, rescheduleFreeHours: 2 } },
    { key: "platform_fee", value: { inrMinor: PLATFORM_FEE, gstRate: 0.18 } },
    { key: "consent_versions", value: { terms: "1.0", privacy: "1.0", telemedicine: "1.0" } },
  ]);

  /* ---------------------------------------------------------- specialties */
  const specIds: Record<string, string> = {};
  for (const sp of SPECIALTIES) {
    const { reviewer: _r, ...rest } = sp;
    const [row] = await db.insert(s.specialties).values(rest).returning({ id: s.specialties.id });
    specIds[sp.slug] = row!.id;
  }

  /* ---------------------------------------------------------------- staff */
  const mfa = { mfaSecretEnc: encryptText(DEMO_TOTP_SECRET), mfaEnabledAt: now };
  const [admin] = await db
    .insert(s.users)
    .values({ role: "super_admin", name: STAFF.admin.name, email: STAFF.admin.email, phone: STAFF.admin.phone, onboarded: true, ...mfa })
    .returning();
  const [careCoord] = await db
    .insert(s.users)
    .values({ role: "care_coordinator", name: STAFF.careCoordinator.name, email: STAFF.careCoordinator.email, phone: STAFF.careCoordinator.phone, onboarded: true, ...mfa })
    .returning();

  /* -------------------------------------------------------------- clinics */
  const clinicIds: Record<string, string> = {};
  const clinicRows: Record<string, typeof s.clinics.$inferSelect> = {};
  for (const c of CLINICS) {
    const { coordinator, ...data } = c;
    const [row] = await db
      .insert(s.clinics)
      .values({
        ...data,
        facilities: [...data.facilities],
        accreditations: [...data.accreditations],
        timings: [...data.timings],
        internationalDesk: data.internationalDesk ? { ...data.internationalDesk, languages: [...data.internationalDesk.languages] } : null,
        photos: [
          { url: `/images/clinic-${c.slug.split("-")[0]}-1.svg`, alt: `${c.name} entrance` },
          { url: `/images/clinic-${c.slug.split("-")[0]}-2.svg`, alt: `${c.name} reception` },
        ],
        verificationStatus: "approved",
        verifiedAt: daysAgo(200),
        verifiedBy: admin!.id,
      })
      .returning();
    clinicIds[c.slug] = row!.id;
    clinicRows[c.slug] = row!;
    const [u] = await db
      .insert(s.users)
      .values({ role: "clinic_coordinator", name: coordinator.name, email: coordinator.email, phone: coordinator.phone, onboarded: true, ...mfa })
      .returning();
    await db.insert(s.clinicStaff).values({ clinicId: row!.id, userId: u!.id, title: c.kind === "hospital" ? "International & OPD coordinator" : "Front desk coordinator" });
  }

  /* -------------------------------------------------------------- doctors */
  type DoctorRow = typeof s.doctors.$inferSelect & { seed: DoctorSeed; userId: string };
  const doctors: Record<string, DoctorRow> = {};
  let phoneN = 200;
  let avatarSeed = 1;
  for (const d of DOCTORS) {
    const [u] = await db
      .insert(s.users)
      .values({
        role: "doctor",
        name: d.fullName,
        email: `${d.slug.replace(/^dr-/, "")}@doctors.caremitra.example`,
        phone: `+9198000${String(++phoneN).padStart(5, "0")}`,
        onboarded: true,
        timeZone: d.timeZone ?? IST,
        ...mfa,
      })
      .returning();
    const status = d.verification ?? "approved";
    const lastVerified = status === "approved" ? daysAgo(30 + Math.floor(random() * 200)) : null;
    const modes = (["video", "audio", "chat", "in_clinic"] as const).filter((m) => d.feesInr[m] !== undefined);
    const [row] = await db
      .insert(s.doctors)
      .values({
        userId: u!.id,
        slug: d.slug,
        fullName: d.fullName,
        gender: d.gender,
        avatarSeed: avatarSeed++,
        languages: d.languages,
        specialtyId: specIds[d.specialty]!,
        subSpecialties: d.subSpecialties,
        conditionsTreated: d.conditionsTreated,
        procedures: d.procedures,
        experienceYears: d.experienceYears,
        primaryClinicId: d.clinic ? clinicIds[d.clinic] : null,
        pastPositions: d.pastPositions,
        awards: d.awards ?? [],
        memberships: d.memberships ?? [],
        publications: d.publications ?? [],
        videoIntroUrl: d.hasVideoIntro ? `/videos/intro-placeholder.webm` : null,
        about: d.about,
        headline: d.headline,
        timeZone: d.timeZone ?? IST,
        modes: [...modes],
        consultMinutes: d.consultMinutes ?? 15,
        chatResponseMinutes: d.chatResponseMinutes ?? 30,
        followUpChatDays: d.followUpChatDays ?? 3,
        acceptsInstant: d.acceptsInstant ?? false,
        offersSecondOpinion: d.offersSecondOpinion ?? false,
        verificationStatus: status,
        submittedAt: daysAgo(400),
        lastVerifiedAt: lastVerified,
        lastVerifiedBy: lastVerified ? admin!.id : null,
        reverifyDueAt: lastVerified ? new Date(lastVerified.getTime() + 365 * 86400_000) : null,
        payoutDetails: { accountName: d.fullName.replace(/^Dr\.\s*/, ""), bankLast4: String(1000 + avatarSeed * 37).slice(-4), ifsc: "DEMO0001234", upi: `${d.slug}@demo` },
      })
      .returning();
    doctors[d.slug] = { ...row!, seed: d, userId: u!.id };

    await db.insert(s.doctorQualifications).values(d.qualifications.map((q) => ({ doctorId: row!.id, ...q })));
    await db.insert(s.doctorLicences).values(
      d.licences.map((l) => {
        const expires = addDays(today, l.expiresInDays ?? 700);
        const lstatus = l.status ?? "verified";
        return {
          doctorId: row!.id,
          country: l.country,
          region: l.region ?? null,
          number: l.number,
          issuingBody: l.issuingBody,
          issuedAt: addDays(today, -(d.experienceYears * 365)),
          expiresAt: expires,
          status: lstatus,
          verifiedBy: lstatus === "verified" || lstatus === "suspended" ? admin!.id : null,
          verifiedAt: lstatus === "verified" ? lastVerified ?? daysAgo(100) : null,
          verificationReference:
            lstatus === "verified"
              ? l.country === "IN"
                ? `Checked on ${l.issuingBody} online register (demo); NMC Indian Medical Register cross-check`
                : `Checked on ${l.issuingBody} public register (demo)`
              : null,
          notes: lstatus === "suspended" ? "Suspended by council (demo)" : null,
        };
      }),
    );
    const fees: (typeof s.doctorFees.$inferInsert)[] = [];
    for (const m of modes) fees.push({ doctorId: row!.id, mode: m, currency: "INR", amountMinor: d.feesInr[m]! * 100 });
    for (const f of d.foreignFees ?? []) {
      for (const m of ["video", "audio", "chat"] as const) if (f[m]) fees.push({ doctorId: row!.id, mode: m, currency: f.currency, amountMinor: f[m]! * 100 });
    }
    await db.insert(s.doctorFees).values(fees);
    if (d.clinic) {
      await db.insert(s.doctorClinicLinks).values({ doctorId: row!.id, clinicId: clinicIds[d.clinic]!, role: "Consultant", inClinicFeeMinor: (d.feesInr.in_clinic ?? 0) * 100 });
    }
    const rules: (typeof s.availabilityRules.$inferInsert)[] = [];
    for (const r of d.rules) {
      for (const day of r.days) {
        rules.push({
          doctorId: row!.id,
          group: r.group,
          clinicId: r.clinic ? clinicIds[r.clinic] : null,
          weekday: day,
          startTime: r.start,
          endTime: r.end,
          slotMinutes: d.consultMinutes ?? 15,
          timeZone: r.tz ?? IST,
        });
      }
    }
    await db.insert(s.availabilityRules).values(rules);
  }

  // Specialty and condition content reviewed by a doctor.
  for (const sp of SPECIALTIES) {
    await db
      .update(s.specialties)
      .set({ reviewedByDoctorId: doctors[sp.reviewer]!.id, reviewedAt: daysAgo(40) })
      .where(eq(s.specialties.slug, sp.slug));
  }
  for (const c of CONDITIONS) {
    const reviewer = SPECIALTIES.find((x) => x.slug === c.specialty)!.reviewer;
    await db.insert(s.conditions).values({
      slug: c.slug,
      name: c.name,
      specialtyId: specIds[c.specialty]!,
      summary: c.summary,
      body: c.body,
      symptoms: c.symptoms,
      whenToSeeDoctor: c.whenToSeeDoctor,
      faqs: c.faqs,
      reviewedByDoctorId: doctors[reviewer]!.id,
      reviewedAt: daysAgo(35),
    });
  }

  await materializeSlots(db, { days: 21, now });

  /* ------------------------------------------------------------ catalogue */
  const medRows = await db
    .insert(s.medicines)
    .values(MEDICINES.map(([genericName, form, strengths, drugClass, tpgList, schedule, brands]) => ({ genericName, form, strengths, drugClass, tpgList, schedule, brandExamples: brands ?? [] })))
    .returning();
  const med = (name: string, form?: string) => {
    const m = medRows.find((r) => r.genericName === name && (!form || r.form === form));
    if (!m) throw new Error(`Seed medicine missing: ${name}`);
    return m;
  };
  await db.insert(s.interpreters).values(INTERPRETERS);
  const planRows = await db.insert(s.plans).values(PLANS.map((p) => ({ ...p, features: [...p.features], readingTypes: [...p.readingTypes] }))).returning();
  await db.insert(s.coupons).values([
    { code: "FIRST50", description: "50% off your first consult (up to ₹200)", kind: "percent", value: 50, maxDiscountMinor: 20000, firstConsultOnly: true, maxUses: 10000 },
    { code: "CARE100", description: "₹100 off any consult", kind: "flat", value: 10000, maxUses: 5000, validUntil: new Date(now.getTime() + 90 * 86400_000) },
  ]);
  for (const a of ARTICLES) {
    await db.insert(s.articles).values({
      slug: a.slug,
      title: a.title,
      summary: a.summary,
      body: a.body,
      category: a.category,
      specialtyId: a.specialty ? specIds[a.specialty] : null,
      reviewedByDoctorId: doctors[a.reviewer]!.id,
      reviewedAt: daysAgo(20),
      readMinutes: a.readMinutes,
      published: true,
      publishedAt: daysAgo(60),
    });
  }

  /* ------------------------------------------------------------- patients */
  type PatientRow = typeof s.patients.$inferSelect;
  const users: Record<string, typeof s.users.$inferSelect> = {};
  const patients: Record<string, PatientRow> = {};
  for (const acc of ACCOUNTS) {
    const [u] = await db
      .insert(s.users)
      .values({
        role: acc.role,
        name: acc.name,
        email: acc.email,
        phone: acc.phone,
        countryCode: acc.country,
        language: acc.language,
        currency: acc.currency,
        timeZone: acc.timeZone,
        onboarded: true,
        whatsappOptIn: acc.whatsappOptIn ?? false,
        preferences: acc.preferences ?? {},
        lastLoginAt: daysAgo(2),
      })
      .returning();
    users[acc.key] = u!;
    await db.insert(s.consents).values([
      { userId: u!.id, type: "terms", version: "1.0", granted: true, method: "checkbox" },
      { userId: u!.id, type: "privacy", version: "1.0", granted: true, method: "checkbox" },
      { userId: u!.id, type: "telemedicine", version: "1.0", granted: true, method: "checkbox" },
      ...(acc.whatsappOptIn ? [{ userId: u!.id, type: "whatsapp", version: "1.0", granted: true, method: "toggle" }] : []),
    ]);
    if (acc.self) {
      const [p] = await db
        .insert(s.patients)
        .values({ userId: u!.id, ownerUserId: u!.id, ...personValues(acc.self) })
        .returning();
      patients[acc.key] = p!;
    }
    for (const f of acc.family) {
      const [p] = await db.insert(s.patients).values({ ownerUserId: u!.id, ...personValues(f) }).returning();
      patients[f.key] = p!;
      const active = f.consent !== "pending";
      await db.insert(s.familyLinks).values({
        caregiverUserId: u!.id,
        patientId: p!.id,
        relationship: f.relationship,
        status: active ? "active" : "pending_consent",
        consentMethod: active ? f.consent : null,
        consentAt: active ? daysAgo(60) : null,
      });
      if (active) {
        await db.insert(s.consents).values({
          userId: u!.id,
          patientId: p!.id,
          type: "caregiver_booking",
          version: "1.0",
          granted: true,
          method: f.consent === "otp" ? "otp" : "explicit_verbal",
        });
      }
    }
  }

  /* ---------------------------------------------------------- helpers */
  const feeFor = (doc: DoctorRow, mode: "video" | "audio" | "chat" | "in_clinic", currency = "INR") => {
    if (currency !== "INR") {
      const f = doc.seed.foreignFees?.find((x) => x.currency === currency);
      if (f && mode !== "in_clinic" && f[mode]) return f[mode]! * 100;
    }
    return (doc.seed.feesInr[mode] ?? doc.seed.feesInr.video ?? 500) * 100;
  };

  async function claimSlot(doc: DoctorRow, group: "online" | "in_clinic", after: Date) {
    const [slot] = await db
      .select()
      .from(s.availabilitySlots)
      .where(and(eq(s.availabilitySlots.doctorId, doc.id), eq(s.availabilitySlots.group, group), eq(s.availabilitySlots.status, "open"), gt(s.availabilitySlots.startAt, after)))
      .orderBy(s.availabilitySlots.startAt)
      .limit(1);
    return slot;
  }

  type ApptOpts = {
    patient: PatientRow;
    bookedBy: typeof s.users.$inferSelect;
    bookedByRole?: string;
    doctor: DoctorRow;
    mode: "video" | "audio" | "chat" | "in_clinic";
    startAt: Date;
    status: (typeof s.appointmentStatusEnum.enumValues)[number];
    consultType?: "first" | "follow_up";
    location?: { country: string; region?: string };
    currency?: string;
    complaint: string;
    slotId?: string | null;
    clinicId?: string | null;
    journeyId?: string | null;
    parentAppointmentId?: string | null;
    patientTz?: string;
    creditMinor?: number;
    paymentMode?: string;
  };

  async function mkAppointment(o: ApptOpts) {
    const currency = o.currency ?? "INR";
    const fee = feeFor(o.doctor, o.mode, currency);
    const isIndia = currency === "INR";
    const platform = isIndia ? PLATFORM_FEE : Math.round(PLATFORM_FEE * DEMO_FX[currency]!);
    const tax = isIndia ? GST : 0;
    const credit = o.creditMinor ?? 0;
    const total = Math.max(0, fee - credit) + platform + tax;
    const minutes = o.doctor.consultMinutes;
    const ended = o.status === "completed";
    let journeyId = o.journeyId;
    if (!journeyId) {
      const [j] = await db.insert(s.careJourneys).values({ patientId: o.patient.id, title: o.complaint, createdAt: o.startAt }).returning();
      journeyId = j!.id;
    }
    const [a] = await db
      .insert(s.appointments)
      .values({
        ref: refs.appointment(),
        patientId: o.patient.id,
        bookedByUserId: o.bookedBy.id,
        bookedByRole: o.bookedByRole ?? "patient",
        doctorId: o.doctor.id,
        clinicId: o.clinicId ?? null,
        slotId: o.slotId ?? null,
        journeyId,
        parentAppointmentId: o.parentAppointmentId ?? null,
        mode: o.mode,
        consultType: o.consultType ?? "first",
        status: o.status,
        startAt: o.startAt,
        endAt: addMinutes(o.startAt, minutes),
        doctorTimeZone: o.doctor.timeZone,
        patientTimeZone: o.patientTz ?? IST,
        patientLocationCountry: o.location?.country ?? "IN",
        patientLocationRegion: o.location?.region ?? null,
        locationConfirmedAt: o.startAt,
        locationSource: "self_declared",
        chiefComplaint: o.complaint,
        preConsult: {
          mainProblem: o.complaint,
          since: "1 week",
          currentMedicines: o.patient.currentMedicines.join(", "),
          allergies: o.patient.allergies.join(", ") || "None",
          pastConditions: o.patient.conditions.join(", ") || "None",
          shareHistory: true,
          documentIds: [],
          consentGiven: true,
          submittedAt: addMinutes(o.startAt, -60).toISOString(),
        },
        currency,
        feeMinor: fee,
        platformFeeMinor: platform,
        taxMinor: tax,
        creditMinor: credit,
        totalMinor: total,
        paymentMode: o.paymentMode ?? "online",
        policySnapshot: {
          refund: "Full refund if the doctor does not join within 10 minutes, or if you cancel 4+ hours before. 50% refund for later cancellations.",
          reschedule: "Free reschedule up to 2 hours before.",
          consultMinutes: minutes,
        },
        patientJoinedAt: ended ? addMinutes(o.startAt, -3) : null,
        doctorJoinedAt: ended ? addMinutes(o.startAt, 1) : null,
        startedAt: ended ? addMinutes(o.startAt, 1) : null,
        endedAt: ended ? addMinutes(o.startAt, minutes) : null,
        endedBy: ended ? "doctor" : null,
        outcome: ended ? "completed" : null,
        identityConfirmedAt: ended ? addMinutes(o.startAt, 2) : null,
        followUpChatUntil: ended ? new Date(addMinutes(o.startAt, minutes).getTime() + o.doctor.followUpChatDays * 86400_000) : null,
        createdAt: addMinutes(o.startAt, -60 * 24),
      })
      .returning();
    if (o.slotId) await db.update(s.availabilitySlots).set({ status: "booked", appointmentId: a!.id }).where(eq(s.availabilitySlots.id, o.slotId));
    if (["confirmed", "completed", "in_progress", "checked_in"].includes(o.status) && a!.paymentMode === "online") {
      const capturedAt = addMinutes(o.startAt, -60 * 23);
      await db.insert(s.payments).values({
        userId: o.bookedBy.id,
        patientId: o.patient.id,
        appointmentId: a!.id,
        purpose: o.mode === "in_clinic" ? "clinic_visit" : "consult",
        gateway: "demo",
        gatewayOrderId: `order_demo_${shortCode(10)}`,
        gatewayPaymentId: `pay_demo_${shortCode(12)}`,
        method: isIndia ? pick(["upi", "upi", "card", "netbanking", "wallet"]) : "intl_card",
        currency,
        amountMinor: total,
        feeMinor: fee - credit,
        platformFeeMinor: platform,
        taxMinor: tax,
        taxLines: isIndia
          ? [
              { label: "Consultation fee (exempt healthcare service)", rate: 0, amountMinor: 0, sac: "999312" },
              { label: "CGST on platform fee", rate: 0.09, amountMinor: 225, sac: "998599" },
              { label: "SGST on platform fee", rate: 0.09, amountMinor: 225, sac: "998599" },
            ]
          : [{ label: "Export of service (zero-rated)", rate: 0, amountMinor: 0 }],
        fxRate: DEMO_FX[currency] ?? 1,
        fxAsOf: asOf,
        status: "captured",
        payoutState: o.status === "completed" ? "released" : "held",
        invoiceNumber: invoiceNo(capturedAt),
        invoiceIssuedAt: capturedAt,
        billing: { name: o.bookedBy.name, phone: o.bookedBy.phone ?? undefined, email: o.bookedBy.email ?? undefined, state: isIndia ? "Maharashtra" : undefined, country: o.bookedBy.countryCode },
        capturedAt,
        createdAt: capturedAt,
      });
    }
    return a!;
  }

  type RxItem = { name: string; form?: string; strength: string; dose: string; frequency: string; timing: string; days: number; instructions?: string };

  async function completeWithNotes(
    appt: typeof s.appointments.$inferSelect,
    doc: DoctorRow,
    patient: PatientRow,
    n: { complaint: string; findings: string; diagnosis: string; advice: string; summary: string; investigations?: string[]; warning?: string; followUpDays?: number; rx?: RxItem[] },
  ) {
    const followUp = n.followUpDays ? addDays(dayInZone(appt.startAt, IST), n.followUpDays) : null;
    await db.insert(s.consultNotes).values({
      appointmentId: appt.id,
      patientId: patient.id,
      doctorId: doc.id,
      complaint: n.complaint,
      history: `Symptoms for about a week. ${patient.conditions.length ? "Known: " + patient.conditions.join(", ") + "." : ""}`,
      findings: n.findings,
      diagnosis: n.diagnosis,
      provisional: true,
      advice: n.advice,
      investigations: n.investigations ?? [],
      warningSigns: n.warning ?? "Get help urgently for chest pain, breathlessness, fainting or confusion.",
      patientSummary: n.summary,
      followUpDate: followUp,
      finalisedAt: appt.endAt,
    });
    if (!n.rx?.length) return null;
    const lic = (await db.select().from(s.doctorLicences).where(eq(s.doctorLicences.doctorId, doc.id))).filter(
      (l) => l.status === "verified" && l.country === appt.patientLocationCountry,
    );
    const quals = await db.select().from(s.doctorQualifications).where(eq(s.doctorQualifications.doctorId, doc.id));
    const clinic = doc.primaryClinicId ? Object.values(clinicRows).find((c) => c.id === doc.primaryClinicId) : null;
    const number = refs.prescription();
    const items = n.rx.map((r) => {
      const m = med(r.name, r.form);
      return { m, r };
    });
    const snapshot: RxSnapshot = {
      number,
      issuedAt: (appt.endAt ?? appt.startAt).toISOString(),
      brand: brand.name,
      doctor: {
        name: doc.fullName,
        qualifications: quals.map((q) => q.degree).join(", "),
        specialty: SPECIALTIES.find((x) => specIds[x.slug] === doc.specialtyId)!.name,
        registrations: lic.map((l) => ({ number: l.number, issuingBody: l.issuingBody, country: l.country, region: l.region })),
        clinic: clinic ? { name: clinic.name, address: `${clinic.addressLine}, ${clinic.city}, ${clinic.state} ${clinic.postcode}`, phone: clinic.phone } : null,
        contact: brand.supportPhone,
      },
      patient: { name: patient.fullName, age: ageFrom(patient.dob, appt.startAt), sex: patient.sex, location: appt.patientLocationCountry },
      consult: { ref: appt.ref, mode: appt.mode, type: appt.consultType, date: appt.startAt.toISOString() },
      diagnosis: n.diagnosis,
      provisional: true,
      items: items.map(({ m, r }) => ({
        name: m.genericName,
        strength: r.strength,
        form: m.form,
        dose: r.dose,
        frequency: r.frequency,
        frequencyLabel: FREQUENCIES[r.frequency]?.label ?? r.frequency,
        timing: r.timing,
        durationDays: r.days,
        instructions: r.instructions ?? "",
        tpgList: m.tpgList,
      })),
      advice: n.advice,
      investigations: n.investigations ?? [],
      followUpDate: followUp,
    };
    const { signature, hash } = signRx(snapshot);
    const [rx] = await db
      .insert(s.prescriptions)
      .values({
        number,
        appointmentId: appt.id,
        patientId: patient.id,
        doctorId: doc.id,
        consultMode: appt.mode,
        consultType: appt.consultType,
        diagnosis: n.diagnosis,
        provisional: true,
        advice: n.advice,
        investigations: n.investigations ?? [],
        followUpDate: followUp,
        snapshot,
        signature,
        payloadHash: hash,
        issuedAt: appt.endAt ?? appt.startAt,
      })
      .returning();
    await db.insert(s.prescriptionItems).values(
      items.map(({ m, r }, i) => ({
        prescriptionId: rx!.id,
        patientId: patient.id,
        medicineId: m.id,
        name: m.genericName,
        form: m.form,
        strength: r.strength,
        dose: r.dose,
        frequency: r.frequency,
        timing: r.timing,
        durationDays: r.days,
        instructions: r.instructions ?? "",
        tpgList: m.tpgList,
        sortOrder: i,
      })),
    );
    return rx!;
  }

  async function addDoc(o: { patient?: PatientRow; caseId?: string; appointmentId?: string; doctorId?: string; uploadedBy: string; category: (typeof s.documentCategoryEnum.enumValues)[number]; title: string; lines: string[]; reportDate?: string }) {
    const pdf = await simplePdf({
      title: o.title,
      subtitle: o.patient ? `Patient: ${o.patient.fullName}` : undefined,
      sections: [{ heading: "Details", lines: o.lines }],
      footer: "DEMO DOCUMENT — generated sample data, not a real medical record.",
    });
    const saved = await saveFile(pdf);
    const [row] = await db
      .insert(s.documents)
      .values({
        patientId: o.patient?.id ?? null,
        caseId: o.caseId ?? null,
        appointmentId: o.appointmentId ?? null,
        doctorId: o.doctorId ?? null,
        uploadedByUserId: o.uploadedBy,
        category: o.category,
        title: o.title,
        fileName: o.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") + ".pdf",
        mimeType: "application/pdf",
        sizeBytes: saved.sizeBytes,
        storageKey: saved.storageKey,
        sha256: saved.sha256,
        reportDate: o.reportDate ?? null,
        source: "upload",
      })
      .returning();
    return row!;
  }

  /* ------------------------------------------------- past consults + reviews */
  const NOTE_TEMPLATES: Record<string, Parameters<typeof completeWithNotes>[3] & { mode: "video" | "audio" | "chat"; type: "first" | "follow_up" }> = {
    "general-physician": {
      mode: "video",
      type: "first",
      complaint: "Fever and body ache for 2 days",
      findings: "Temperature 100.8 °F reported. Throat mildly red on video. No breathlessness.",
      diagnosis: "Acute viral fever",
      advice: "Rest, plenty of fluids and ORS. Paracetamol for fever. Avoid ibuprofen until dengue is ruled out.",
      summary: "You most likely have a viral fever. Rest, drink plenty of fluids and take paracetamol if the fever is above 100 °F. Get a blood test if the fever lasts beyond 3 days.",
      investigations: ["CBC", "Dengue NS1 (if fever beyond day 3)"],
      followUpDays: 3,
      rx: [
        { name: "Paracetamol", form: "tablet", strength: "650 mg", dose: "1 tablet", frequency: "1-1-1", timing: "after_food", days: 3, instructions: "Only if temperature is above 100 °F. Maximum 3 tablets a day." },
        { name: "Oral rehydration salts (ORS)", strength: "WHO formula", dose: "1 sachet in 1 litre water", frequency: "SOS", timing: "any", days: 3, instructions: "Sip through the day." },
      ],
    },
    paediatrics: {
      mode: "video",
      type: "first",
      complaint: "Cough and runny nose for 3 days",
      findings: "Child active and playful on video. No fast breathing. Feeding well.",
      diagnosis: "Upper respiratory tract infection (viral)",
      advice: "Saline nose drops, warm fluids, paracetamol syrup by weight if fever.",
      summary: "Your child has a common cold. Use saline nose drops, give plenty of fluids, and paracetamol syrup for fever. Watch for fast breathing or poor feeding.",
      followUpDays: 5,
      rx: [
        { name: "Saline nasal drops", strength: "0.65%", dose: "2 drops each nostril", frequency: "1-1-1", timing: "any", days: 5 },
        { name: "Paracetamol", form: "syrup", strength: "250 mg/5 ml", dose: "5 ml", frequency: "SOS", timing: "after_food", days: 3, instructions: "For fever above 100 °F, at least 6 hours apart." },
      ],
    },
    gynaecology: {
      mode: "video",
      type: "first",
      complaint: "Irregular periods for 6 months",
      findings: "Cycles 40–60 days. Mild acne. Ultrasound report suggests polycystic ovaries.",
      diagnosis: "Polycystic ovary syndrome (provisional)",
      advice: "Regular exercise, balanced diet, weight reduction. Blood tests advised.",
      summary: "Your symptoms and scan fit with PCOS. Daily exercise and healthy eating help a lot. Please do the blood tests and we will review them together.",
      investigations: ["TSH", "Prolactin", "Fasting glucose and insulin", "Lipid profile"],
      followUpDays: 21,
      rx: [
        { name: "Myo-inositol", strength: "2 g", dose: "1 sachet", frequency: "1-0-1", timing: "with_food", days: 90 },
        { name: "Folic acid", strength: "5 mg", dose: "1 tablet", frequency: "1-0-0", timing: "after_food", days: 90 },
      ],
    },
    dermatology: {
      mode: "video",
      type: "first",
      complaint: "Pimples on face for 4 months",
      findings: "Comedones and papules on cheeks and forehead. No nodules or scarring.",
      diagnosis: "Acne vulgaris, mild to moderate",
      advice: "Gentle face wash twice daily, oil-free sunscreen. Do not pick pimples.",
      summary: "You have mild to moderate acne. Use the gel at night and the wash twice a day. It takes 6–8 weeks to see results, so please keep going.",
      followUpDays: 42,
      rx: [
        { name: "Adapalene", strength: "0.1%", dose: "Pea-sized amount", frequency: "0-0-1", timing: "bedtime", days: 60, instructions: "Apply on the whole face at night. May sting for the first week." },
        { name: "Benzoyl peroxide", strength: "2.5%", dose: "Thin layer", frequency: "1-0-0", timing: "any", days: 60, instructions: "Morning, on spots only." },
      ],
    },
    cardiology: {
      mode: "video",
      type: "follow_up",
      complaint: "Blood pressure review",
      findings: "Home BP 145–150/90–95 over 2 weeks. No chest pain or breathlessness.",
      diagnosis: "Essential hypertension, not at target",
      advice: "Reduce salt, walk 30 minutes daily, continue home BP log.",
      summary: "Your blood pressure is still a little high. We increased your tablet. Keep checking your BP twice a day and log it in the app.",
      investigations: ["Lipid profile", "Serum creatinine", "ECG"],
      followUpDays: 28,
      rx: [
        { name: "Telmisartan", strength: "40 mg", dose: "1 tablet", frequency: "1-0-0", timing: "after_food", days: 30 },
        { name: "Atorvastatin", strength: "10 mg", dose: "1 tablet", frequency: "0-0-1", timing: "after_food", days: 30 },
      ],
    },
    orthopaedics: {
      mode: "video",
      type: "first",
      complaint: "Knee pain while climbing stairs",
      findings: "Pain in both knees, worse on stairs. X-ray report: moderate osteoarthritis.",
      diagnosis: "Osteoarthritis of both knees",
      advice: "Quadriceps strengthening exercises daily. Weight reduction. Avoid squatting.",
      summary: "You have wear and tear in both knees (osteoarthritis). Daily exercises and the gel will help. Let's review in 6 weeks.",
      followUpDays: 42,
      rx: [
        { name: "Diclofenac", strength: "1%", dose: "Apply a thin layer", frequency: "1-0-1", timing: "any", days: 21 },
        { name: "Calcium carbonate + vitamin D3", strength: "500 mg + 250 IU", dose: "1 tablet", frequency: "0-1-0", timing: "after_food", days: 60 },
        { name: "Paracetamol", form: "tablet", strength: "650 mg", dose: "1 tablet", frequency: "SOS", timing: "after_food", days: 14, instructions: "For pain, up to 3 a day." },
      ],
    },
    psychiatry: {
      mode: "video",
      type: "follow_up",
      complaint: "Anxiety follow-up",
      findings: "Sleep better. Worry reduced. No side effects reported.",
      diagnosis: "Generalised anxiety disorder, improving",
      advice: "Continue breathing exercises and CBT worksheets. Regular sleep times.",
      summary: "You are doing better. Continue the same medicine and the exercises. We'll meet again in 4 weeks.",
      followUpDays: 28,
      rx: [{ name: "Escitalopram", strength: "10 mg", dose: "1 tablet", frequency: "1-0-0", timing: "after_food", days: 30 }],
    },
    endocrinology: {
      mode: "video",
      type: "follow_up",
      complaint: "Diabetes review",
      findings: "HbA1c 7.8%. Fasting sugars 130–150 mg/dL.",
      diagnosis: "Type 2 diabetes mellitus, suboptimal control",
      advice: "Diet: reduce rice and sweets. Walk after meals. Log fasting and after-meal sugars.",
      summary: "Your sugar control is a bit above target. Take metformin twice a day after food, walk after meals and log your sugars. We'll check HbA1c again in 3 months.",
      investigations: ["HbA1c in 3 months", "Urine albumin-creatinine ratio"],
      followUpDays: 30,
      rx: [{ name: "Metformin", strength: "500 mg", dose: "1 tablet", frequency: "1-0-1", timing: "after_food", days: 30 }],
    },
  };

  const reviewerPool = ["asha", "rahul", "priya", "sunita", "krishnan", "lakshmi", "saraswathi", "neha", "vikram", "ananya", "kabir"] as const;
  const accountFor: Record<string, string> = { priya: "rahul", kabir: "rahul", krishnan: "arjun", lakshmi: "arjun", saraswathi: "meera" };
  const visibleDoctors = Object.values(doctors).filter((d) => d.verificationStatus === "approved" && d.slug !== "dr-karan-sethi");
  const specSlugById = Object.fromEntries(Object.entries(specIds).map(([k, v]) => [v, k]));

  for (const doc of visibleDoctors) {
    const count = 3 + Math.floor(random() * 3);
    for (let i = 0; i < count; i++) {
      const pk = specSlugById[doc.specialtyId] === "paediatrics" ? "kabir" : pick(reviewerPool.filter((k) => k !== "kabir"));
      const patient = patients[pk]!;
      const booker = users[accountFor[pk] ?? pk]!;
      const tpl = NOTE_TEMPLATES[specSlugById[doc.specialtyId]!]!;
      const startAt = daysAgo(5 + Math.floor(random() * 80), pick(["10:00", "11:30", "17:00", "19:00"]));
      const appt = await mkAppointment({
        patient,
        bookedBy: booker,
        bookedByRole: accountFor[pk] ? "caregiver" : "patient",
        doctor: doc,
        mode: tpl.mode,
        consultType: tpl.type,
        startAt,
        status: "completed",
        complaint: tpl.complaint,
      });
      await completeWithNotes(appt, doc, patient, tpl);
      if (random() < 0.8) {
        const r = pick(REVIEW_TEXTS);
        await db.insert(s.reviews).values({
          appointmentId: appt.id,
          doctorId: doc.id,
          patientId: patient.id,
          authorUserId: booker.id,
          authorDisplayName: `${booker.name.split(" ")[0]} ${booker.name.split(" ")[1]?.[0] ?? ""}.`,
          rating: r.rating,
          text: r.text,
          doctorReply: r.rating <= 3 ? "I'm sorry about the delay; an emergency ran over. Thank you for your patience." : random() < 0.3 ? "Thank you! Wishing you good health." : null,
          repliedAt: r.rating <= 3 ? addMinutes(startAt, 60 * 30) : null,
          createdAt: addMinutes(startAt, 60 * 3),
        });
      }
    }
  }
  await db.execute(sql`
    update doctors d set
      rating_avg = coalesce((select round(avg(rating)::numeric, 2) from reviews r where r.doctor_id = d.id and r.status = 'published'), 0),
      rating_count = (select count(*) from reviews r where r.doctor_id = d.id and r.status = 'published'),
      consult_count = (select count(*) from appointments a where a.doctor_id = d.id and a.status = 'completed') + d.experience_years * 40
  `);

  /* -------------------------------------------------------- scenarios */
  const D = doctors;
  const P = patients;
  const U = users;

  // 1. Asha (60+): upcoming video consult tomorrow morning with Dr. Kavita Sharma.
  const tomorrow9 = zonedTimeToUtc(addDays(today, 1), "09:00", IST);
  const ashaSlot = await claimSlot(D["dr-kavita-sharma"]!, "online", tomorrow9);
  if (ashaSlot) {
    await mkAppointment({
      patient: P.asha!, bookedBy: U.asha!, doctor: D["dr-kavita-sharma"]!, mode: "video", startAt: ashaSlot.startAt,
      status: "confirmed", complaint: "Knee pain and BP check", slotId: ashaSlot.id,
    });
  }

  // 2. Rahul's son Kabir: video consult with the paediatrician.
  const kabirSlot = await claimSlot(D["dr-meenakshi-sundaram"]!, "online", zonedTimeToUtc(addDays(today, 2), "09:00", IST));
  if (kabirSlot) {
    await mkAppointment({
      patient: P.kabir!, bookedBy: U.rahul!, bookedByRole: "patient", doctor: D["dr-meenakshi-sundaram"]!, mode: "video",
      startAt: kabirSlot.startAt, status: "confirmed", complaint: "Cough for 5 days, mild fever", slotId: kabirSlot.id,
    });
  }

  // 3. Family abroad: Arjun (London) books for his father in Kochi. India consult.
  const krishnanSlot = await claimSlot(D["dr-anita-joseph"]!, "online", zonedTimeToUtc(addDays(today, 1), "19:00", IST));
  if (krishnanSlot) {
    const a = await mkAppointment({
      patient: P.krishnan!, bookedBy: U.arjun!, bookedByRole: "caregiver", doctor: D["dr-anita-joseph"]!, mode: "video",
      startAt: krishnanSlot.startAt, status: "confirmed", complaint: "Dizziness in the mornings; medicine review",
      slotId: krishnanSlot.id, currency: "GBP", patientTz: IST,
    });
    await db.update(s.appointments).set({ explicitConsentAt: addMinutes(now, -60 * 24) }).where(eq(s.appointments.id, a.id));
  }

  // 4. John Carter in New York consults a doctor licensed in New York.
  const johnSlot = await claimSlot(D["dr-rajesh-iyer"]!, "online", zonedTimeToUtc(addDays(today, 2), "19:30", IST));
  if (johnSlot) {
    await mkAppointment({
      patient: P.john!, bookedBy: U.john!, doctor: D["dr-rajesh-iyer"]!, mode: "video", startAt: johnSlot.startAt,
      status: "confirmed", complaint: "Second look at my cholesterol and BP plan", slotId: johnSlot.id,
      location: { country: "US", region: "US-NY" }, currency: "USD", patientTz: "America/New_York",
    });
  }

  // 5. Hybrid: Vikram had an online consult; the doctor asked for a clinic visit.
  const vikramAppt = await mkAppointment({
    patient: P.vikram!, bookedBy: U.vikram!, doctor: D["dr-rajesh-iyer"]!, mode: "video", consultType: "first",
    startAt: daysAgo(3, "08:15"), status: "completed", complaint: "Breathlessness on climbing stairs",
  });
  await completeWithNotes(vikramAppt, D["dr-rajesh-iyer"]!, P.vikram!, {
    complaint: "Breathlessness on climbing two floors for 3 weeks. No chest pain at rest.",
    findings: "Home BP 150/94. Pulse 88 regular. Mild ankle swelling reported.",
    diagnosis: "Exertional breathlessness — evaluate for heart cause; hypertension not at target",
    advice: "Please visit the clinic for examination, ECG and echocardiogram. Continue current BP medicine. Avoid heavy exertion until seen.",
    summary: "Your breathlessness needs a check in person. Please book the clinic visit this week for an ECG and a heart scan (echo). Keep taking your BP tablet. If you get chest pain or breathlessness at rest, call 112.",
    investigations: ["ECG", "2D echocardiogram", "Lipid profile", "NT-proBNP"],
    warning: "Call 112 for chest pain, breathlessness at rest, fainting or sweating.",
    rx: [{ name: "Paracetamol", form: "tablet", strength: "500 mg", dose: "1 tablet", frequency: "SOS", timing: "after_food", days: 3, instructions: "For headache only." }],
  });
  await db.update(s.appointments).set({ outcome: "needs_in_person" }).where(eq(s.appointments.id, vikramAppt.id));
  await db.insert(s.consultActions).values({
    appointmentId: vikramAppt.id, patientId: P.vikram!.id, doctorId: D["dr-rajesh-iyer"]!.id, type: "in_person_visit",
    details: { reason: "Examination, ECG and echocardiogram", urgency: "this_week", tests: ["ECG", "2D echo"] },
    targetDoctorId: D["dr-rajesh-iyer"]!.id, targetClinicId: clinicIds[CLINICS[0].slug], dueBy: addDays(today, 7), status: "open",
  });

  // 6. Neha: online consult → clinic visit booked for today with a visit pass.
  const nehaOnline = await mkAppointment({
    patient: P.neha!, bookedBy: U.neha!, doctor: D["dr-kavita-sharma"]!, mode: "video", startAt: daysAgo(4, "10:15"),
    status: "completed", complaint: "Stomach pain on the right side for 2 weeks",
  });
  await completeWithNotes(nehaOnline, D["dr-kavita-sharma"]!, P.neha!, {
    complaint: "Intermittent right upper abdominal pain for 2 weeks, worse after oily food.",
    findings: "No fever. No jaundice reported. Pain 4/10.",
    diagnosis: "Right upper quadrant pain — rule out gallstones",
    advice: "Clinic visit for abdominal examination and ultrasound. Light, low-fat meals meanwhile.",
    summary: "Your stomach pain needs an examination and an ultrasound. I have booked you into the clinic. Eat light, low-fat meals until then. Go to hospital if you get high fever, yellow eyes or severe pain.",
    investigations: ["Ultrasound abdomen", "Liver function tests"],
    warning: "Go to hospital for high fever, yellow eyes, or severe pain.",
    rx: [{ name: "Pantoprazole", strength: "40 mg", dose: "1 tablet", frequency: "1-0-0", timing: "empty_stomach", days: 7 }],
  });
  await db.update(s.appointments).set({ outcome: "needs_in_person" }).where(eq(s.appointments.id, nehaOnline.id));
  const passCode = shortCode(6);
  const visitTime = (() => {
    const t = new Date(now.getTime() + 2 * 3600_000);
    t.setUTCMinutes(t.getUTCMinutes() < 30 ? 0 : 30, 0, 0);
    return t;
  })();
  const nehaVisit = await mkAppointment({
    patient: P.neha!, bookedBy: U.neha!, doctor: D["dr-kavita-sharma"]!, mode: "in_clinic", startAt: visitTime, status: "confirmed",
    complaint: "Clinic visit: abdominal examination and ultrasound", clinicId: clinicIds[CLINICS[0].slug],
    journeyId: nehaOnline.journeyId, parentAppointmentId: nehaOnline.id, creditMinor: 40000,
  });
  await db.update(s.appointments).set({ visitPassCode: passCode }).where(eq(s.appointments.id, nehaVisit.id));
  await db.insert(s.consultActions).values({
    appointmentId: nehaOnline.id, patientId: P.neha!.id, doctorId: D["dr-kavita-sharma"]!.id, type: "in_person_visit",
    details: { reason: "Abdominal examination and ultrasound", urgency: "this_week" }, targetDoctorId: D["dr-kavita-sharma"]!.id,
    targetClinicId: clinicIds[CLINICS[0].slug], status: "booked", bookedAppointmentId: nehaVisit.id,
  });

  // 7. Sunita: diabetes care plan with readings, reminders and a recent consult.
  const sunitaAppt = await mkAppointment({
    patient: P.sunita!, bookedBy: U.sunita!, doctor: D["dr-prakash-venkatesh"]!, mode: "video", consultType: "follow_up",
    startAt: daysAgo(12, "08:30"), status: "completed", complaint: "Monthly diabetes check-in", paymentMode: "plan",
  });
  const sunitaRx = await completeWithNotes(sunitaAppt, D["dr-prakash-venkatesh"]!, P.sunita!, { ...NOTE_TEMPLATES.endocrinology });
  const diabetesPlan = planRows.find((p) => p.slug === "diabetes-care")!;
  const [sub] = await db
    .insert(s.subscriptions)
    .values({
      userId: U.sunita!.id, planId: diabetesPlan.id, patientIds: [P.sunita!.id], status: "active",
      periodStart: daysAgo(15), periodEnd: new Date(daysAgo(15).getTime() + 30 * 86400_000), consultsUsed: 1,
      careDoctorId: D["dr-prakash-venkatesh"]!.id, nextCheckInAt: zonedTimeToUtc(addDays(today, 15), "08:30", IST),
    })
    .returning();
  await db.update(s.appointments).set({ subscriptionId: sub!.id }).where(eq(s.appointments.id, sunitaAppt.id));
  await db.insert(s.payments).values({
    userId: U.sunita!.id, patientId: P.sunita!.id, subscriptionId: sub!.id, purpose: "plan", gateway: "demo",
    gatewayOrderId: `order_demo_${shortCode(10)}`, gatewayPaymentId: `pay_demo_${shortCode(12)}`, method: "upi", currency: "INR",
    amountMinor: diabetesPlan.priceMinor, feeMinor: diabetesPlan.priceMinor, status: "captured", payoutState: "released",
    invoiceNumber: invoiceNo(daysAgo(15)), invoiceIssuedAt: daysAgo(15), capturedAt: daysAgo(15), createdAt: daysAgo(15),
    billing: { name: U.sunita!.name, phone: U.sunita!.phone ?? undefined, country: "IN", state: "Karnataka" },
  });
  const readings: (typeof s.readings.$inferInsert)[] = [];
  for (let i = 30; i >= 0; i--) {
    readings.push({ patientId: P.sunita!.id, type: "glucose_fasting", value: Math.round(158 - (30 - i) * 0.9 + (random() * 14 - 7)), unit: "mg/dL", takenAt: daysAgo(i, "07:15"), recordedByUserId: U.sunita!.id });
    if (i % 2 === 0) readings.push({ patientId: P.sunita!.id, type: "glucose_post_meal", value: Math.round(215 - (30 - i) * 1.2 + (random() * 20 - 10)), unit: "mg/dL", takenAt: daysAgo(i, "15:00"), recordedByUserId: U.sunita!.id });
    if (i % 7 === 0) readings.push({ patientId: P.sunita!.id, type: "weight", value: 72 - (30 - i) * 0.03, unit: "kg", takenAt: daysAgo(i, "07:00"), recordedByUserId: U.sunita!.id });
  }
  for (let i = 14; i >= 0; i--) {
    for (const t of ["07:30", "20:30"]) {
      readings.push({
        patientId: P.krishnan!.id, type: "bp", value: Math.round(142 - (14 - i) * 0.6 + (random() * 10 - 5)), value2: Math.round(88 - (14 - i) * 0.3 + (random() * 6 - 3)),
        unit: "mmHg", takenAt: daysAgo(i, t), recordedByUserId: U.arjun!.id, note: i === 3 && t === "07:30" ? "Felt dizzy on standing" : null,
      });
    }
  }
  await db.insert(s.readings).values(readings);
  if (sunitaRx) {
    const [item] = await db.select().from(s.prescriptionItems).where(eq(s.prescriptionItems.prescriptionId, sunitaRx.id));
    await db.insert(s.medicineReminders).values({
      patientId: P.sunita!.id, prescriptionItemId: item!.id, name: "Metformin 500 mg", dose: "1 tablet after food",
      times: ["08:00", "21:00"], timeZone: IST, startDate: dayInZone(sunitaAppt.startAt, IST), endDate: addDays(dayInZone(sunitaAppt.startAt, IST), 30),
      refillAlertDate: addDays(dayInZone(sunitaAppt.startAt, IST), 25), instructions: "After breakfast and after dinner",
    });
  }

  // 8. Second opinion for Krishnan, assigned to the senior cardiologist.
  const angio = await addDoc({
    patient: P.krishnan!, uploadedBy: U.arjun!.id, category: "report", title: "Coronary angiography report", reportDate: addDays(today, -10),
    lines: ["Left main: normal.", "LAD: 70% proximal stenosis.", "LCx: 30% mid stenosis.", "RCA: dominant, minor irregularities.", "LV function: normal (EF 58%).", "Impression: single-vessel coronary artery disease."],
  });
  const [so] = await db
    .insert(s.secondOpinions)
    .values({
      ref: refs.secondOpinion(), patientId: P.krishnan!.id, requestedByUserId: U.arjun!.id, specialtyId: specIds.cardiology!,
      doctorId: D["dr-rajesh-iyer"]!.id, patientLocationCountry: "IN", question:
        "My father's angiography shows a 70% blockage in one artery. His local doctor suggests a stent. He has no chest pain at rest. Is a stent needed now, or can he continue with medicines and lifestyle changes?",
      history: "Known high BP for 12 years. Mild breathlessness on climbing stairs. Non-smoker.", documentIds: [angio.id],
      status: "assigned", dueAt: new Date(now.getTime() + 30 * 3600_000), currency: "GBP", feeMinor: 4500,
    })
    .returning();
  await db.insert(s.payments).values({
    userId: U.arjun!.id, patientId: P.krishnan!.id, secondOpinionId: so!.id, purpose: "second_opinion", gateway: "demo",
    gatewayOrderId: `order_demo_${shortCode(10)}`, gatewayPaymentId: `pay_demo_${shortCode(12)}`, method: "intl_card", currency: "GBP",
    amountMinor: 4500, feeMinor: 4500, status: "captured", payoutState: "held", invoiceNumber: invoiceNo(now), invoiceIssuedAt: addMinutes(now, -60 * 18),
    capturedAt: addMinutes(now, -60 * 18), fxRate: DEMO_FX.GBP, fxAsOf: asOf, billing: { name: U.arjun!.name, country: "GB" },
  });

  // 9. International case: Fatima from Dhaka, knee replacement in Gurugram.
  const sunrise = clinicRows[CLINICS[0].slug]!;
  const [ic] = await db
    .insert(s.internationalCases)
    .values({
      ref: refs.internationalCase(), patientId: P.fatima!.id, createdByUserId: U.fatima!.id, homeCountry: "BD", currency: "BDT",
      specialtyId: specIds.orthopaedics!, treatmentInterest: "Knee replacement",
      description: "Pain in both knees for 5 years, now unable to walk more than 10 minutes or climb stairs. Injections and physiotherapy have not helped. My doctor in Dhaka advised knee replacement.",
      preferredClinicId: sunrise.id, assignedClinicId: sunrise.id, assignedDoctorId: D["dr-harpreet-gill"]!.id, coordinatorUserId: careCoord!.id,
      status: "plan_sent", preferredLanguage: "bn",
      travel: { attendants: [{ name: "Abdul Rahman", relationship: "Husband", passportCountry: "BD" }], interpreterLanguage: "bn", foodPreferences: "Halal, mildly spiced", localSim: true, airportPickup: { requested: true } },
      createdAt: daysAgo(14),
    })
    .returning();
  const xray = await addDoc({ patient: P.fatima!, caseId: ic!.id, uploadedBy: U.fatima!.id, category: "scan", title: "X-ray both knees (standing)", reportDate: addDays(today, -20), lines: ["Bilateral knee joints, standing AP and lateral views.", "Severe medial joint space narrowing both knees.", "Osteophytes and subchondral sclerosis.", "Impression: Grade IV (Kellgren–Lawrence) osteoarthritis, both knees."] });
  await addDoc({ patient: P.fatima!, caseId: ic!.id, uploadedBy: U.fatima!.id, category: "report", title: "Blood tests (CBC, HbA1c, creatinine)", reportDate: addDays(today, -18), lines: ["Haemoglobin 12.1 g/dL", "HbA1c 5.9%", "Creatinine 0.8 mg/dL", "ECG: normal sinus rhythm (separate report)."] });
  const est = { minInr: 45_000_000, maxInr: 58_000_000 };
  const toBdt = (v: number) => Math.round((v * DEMO_FX.BDT!) / 100000) * 100000;
  const [estimate] = await db
    .insert(s.caseEstimates)
    .values({
      caseId: ic!.id, clinicId: sunrise.id, doctorId: D["dr-harpreet-gill"]!.id,
      recommendedTreatment: "Total knee replacement, both knees (same sitting), with standard implants",
      rationale: "Grade IV osteoarthritis in both knees with severe limitation despite non-surgical treatment. Fit for surgery based on reports; final fitness check on arrival.",
      hospitalDays: 6, indiaDays: 21, costMinInrMinor: est.minInr, costMaxInrMinor: est.maxInr, currency: "BDT",
      costMinMinor: toBdt(est.minInr), costMaxMinor: toBdt(est.maxInr), fxRate: DEMO_FX.BDT!, fxAsOf: asOf,
      inclusions: ["Surgeon and anaesthetist fees", "Standard knee implants", "6 nights in a twin-sharing room", "Medicines and tests during the stay", "In-hospital physiotherapy", "Airport pickup and drop"],
      exclusions: ["Premium implants", "Extra days due to complications", "Hotel stay after discharge", "Flights and visa fees"],
      documentsNeeded: ["Passport (patient and attendant)", "e-Medical visa", "Recent X-rays and blood reports", "List of current medicines"],
      depositMinor: Math.round(10_000_000 * DEMO_FX.BDT!), validUntil: addDays(today, 22), status: "sent", sentAt: daysAgo(8), createdByUserId: careCoord!.id,
    })
    .returning();
  const planPdf = await addDoc({ patient: P.fatima!, caseId: ic!.id, uploadedBy: careCoord!.id, category: "treatment_plan", title: "Treatment plan and estimate", lines: [estimate!.recommendedTreatment, `Hospital stay: ${estimate!.hospitalDays} days; time in India: ${estimate!.indiaDays} days.`, "See the case tracker for the cost estimate in your currency."] });
  void planPdf;
  void xray;
  await db.insert(s.caseEvents).values([
    { caseId: ic!.id, status: "received", note: "Enquiry received. A coordinator will review your reports within 24 hours.", actorRole: "system", createdAt: daysAgo(14) },
    { caseId: ic!.id, status: "under_review", note: "Reports complete. Sent to Dr. Harpreet Gill (joint replacement) for review.", actorUserId: careCoord!.id, actorRole: "care_coordinator", createdAt: daysAgo(12) },
    { caseId: ic!.id, status: "plan_sent", note: "Treatment plan and cost estimate sent. You can book a video call with the doctor before you decide.", actorUserId: careCoord!.id, actorRole: "care_coordinator", createdAt: daysAgo(8) },
  ]);
  await db.insert(s.messages).values([
    { caseId: ic!.id, patientId: P.fatima!.id, senderUserId: U.fatima!.id, senderRole: "patient", senderName: "Fatima Rahman", body: "Thank you. Can my husband stay with me in the hospital room?", createdAt: daysAgo(7) },
    { caseId: ic!.id, patientId: P.fatima!.id, senderUserId: careCoord!.id, senderRole: "coordinator", senderName: "Ravi Kumar (Care coordinator)", body: "Yes, one attendant can stay in the room. We will also arrange a Bengali interpreter for your stay.", createdAt: daysAgo(7) },
  ]);

  /* --------------------------------------------- support, notifications */
  await db.insert(s.complaints).values([
    {
      ref: refs.complaint(), userId: U.ananya!.id, name: U.ananya!.name, contact: U.ananya!.phone!, category: "refund",
      subject: "Refund not received", description: "My consult was cancelled by the doctor 3 days ago but I have not received the refund yet.",
      status: "acknowledged", acknowledgeBy: new Date(daysAgo(1).getTime() + 24 * 3600_000), resolveBy: new Date(daysAgo(1).getTime() + 15 * 86400_000),
      acknowledgedAt: daysAgo(1, "14:00"), updates: [{ at: daysAgo(1, "14:00").toISOString(), by: "Grievance team", note: "We have checked with the payment gateway. Your refund was issued and will reach your account in 5–7 working days.", status: "acknowledged", public: true }],
      createdAt: daysAgo(1),
    },
    {
      ref: refs.complaint(), userId: U.rahul!.id, name: U.rahul!.name, contact: U.rahul!.email!, category: "consult",
      subject: "Doctor joined 12 minutes late", description: "The call started late and I had to leave for work.", status: "resolved",
      acknowledgeBy: daysAgo(19), resolveBy: daysAgo(5), acknowledgedAt: daysAgo(20, "12:00"), resolvedAt: daysAgo(18),
      resolution: "We apologised, refunded the consult fee in full as per our 10-minute promise, and shared feedback with the doctor.",
      updates: [{ at: daysAgo(18).toISOString(), by: "Grievance team", note: "Full refund issued. Sorry for the delay.", status: "resolved", public: true }], createdAt: daysAgo(20),
    },
  ]);
  await db.insert(s.callbackRequests).values([
    { userId: U.asha!.id, name: U.asha!.name, phone: U.asha!.phone!, language: "hi", reason: "booking_help", note: "Please help me book a consult for my knee pain. I prefer Hindi.", preferredTime: "Morning", createdAt: daysAgo(0, "08:10") },
    { userId: U.fatima!.id, name: U.fatima!.name, phone: U.fatima!.phone!, language: "bn", reason: "international", note: "Questions about the visa letter for my husband.", preferredTime: "Afternoon (Dhaka time)", status: "in_progress", assignedToUserId: careCoord!.id, createdAt: daysAgo(1) },
  ]);
  await db.insert(s.notifications).values([
    { userId: U.asha!.id, channel: "in_app", template: "appointment_confirmed", title: "Consult booked", body: "Your video consult with Dr. Kavita Sharma is confirmed.", link: "/consults", status: "sent", sentAt: addMinutes(now, -60 * 20) },
    { userId: U.vikram!.id, channel: "in_app", template: "needs_in_person", title: "Clinic visit recommended", body: "Dr. Rajesh Iyer recommends a clinic visit for an ECG and echo. Book a slot.", link: "/consults", status: "sent", sentAt: daysAgo(3, "09:00") },
    { userId: U.fatima!.id, channel: "in_app", template: "case_plan_sent", title: "Your treatment plan is ready", body: "Sunrise Valley Hospital has sent your treatment plan and estimate.", link: "/international/cases", status: "sent", sentAt: daysAgo(8) },
    { userId: U.arjun!.id, channel: "in_app", template: "second_opinion_assigned", title: "Second opinion in progress", body: "Dr. Rajesh Iyer is reviewing your father's angiography. You will hear within 48 hours.", link: "/second-opinion", status: "sent", sentAt: addMinutes(now, -60 * 16) },
  ]);
  await db.insert(s.payouts).values([
    { doctorId: D["dr-kavita-sharma"]!.id, periodStart: addDays(today, -45), periodEnd: addDays(today, -15), grossMinor: 4_520_000, commissionMinor: 678_000, tdsMinor: 384_200, netMinor: 3_457_800, consults: 118, status: "paid", paidAt: daysAgo(12), reference: "UTR-DEMO-88213" },
    { doctorId: D["dr-rajesh-iyer"]!.id, periodStart: addDays(today, -45), periodEnd: addDays(today, -15), grossMinor: 9_840_000, commissionMinor: 1_476_000, tdsMinor: 836_400, netMinor: 7_527_600, consults: 86, status: "paid", paidAt: daysAgo(12), reference: "UTR-DEMO-88214" },
  ]);

  // Licence reminder already due for Dr. Suresh Patil (expires in 45 days).
  void careCoord;
  return { admin: admin!, careCoord: careCoord!, doctors, users, patients };
}

function personValues(p: {
  fullName: string;
  dob: string;
  sex: "female" | "male";
  phone?: string;
  email?: string;
  country: string;
  city: string;
  bloodGroup?: string;
  allergies?: string[];
  conditions?: string[];
  currentMedicines?: string[];
  emergencyContact?: { name: string; phone: string; relationship: string };
  preferredLanguage?: string;
}) {
  return {
    fullName: p.fullName,
    dob: p.dob,
    sex: p.sex,
    phone: p.phone ?? null,
    email: p.email ?? null,
    country: p.country,
    city: p.city,
    bloodGroup: p.bloodGroup ?? null,
    allergies: p.allergies ?? [],
    conditions: p.conditions ?? [],
    currentMedicines: p.currentMedicines ?? [],
    emergencyContact: p.emergencyContact ?? null,
    preferredLanguage: p.preferredLanguage ?? null,
  };
}

/** Exposed for tests: hash used for visit pass codes. */
export const hashCode = keyedHash;
