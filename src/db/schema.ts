/**
 * Database schema (PostgreSQL). Column names are snake_case in the database
 * (drizzle `casing: "snake_case"`). Money is stored in minor units (paise,
 * cents) with its currency. Every timestamp is stored in UTC (timestamptz)
 * and shown in the viewer's time zone.
 *
 * Row-level security for medical records lives in drizzle/0001_rls.sql.
 */
import {
  bigserial,
  boolean,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

const id = () => uuid().primaryKey().defaultRandom();
const createdAt = () => timestamp({ withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());
const ts = () => timestamp({ withTimezone: true });

/* ------------------------------------------------------------------ enums */

export const roleEnum = pgEnum("role", [
  "patient",
  "caregiver",
  "doctor",
  "clinic_coordinator",
  "care_coordinator",
  "super_admin",
]);
export const userStatusEnum = pgEnum("user_status", ["active", "suspended", "deletion_requested", "deleted"]);
export const sexEnum = pgEnum("sex", ["female", "male", "other"]);
export const consultModeEnum = pgEnum("consult_mode", ["video", "audio", "chat", "in_clinic"]);
export const slotGroupEnum = pgEnum("slot_group", ["online", "in_clinic"]);
export const slotStatusEnum = pgEnum("slot_status", ["open", "held", "booked", "blocked"]);
export const verificationStatusEnum = pgEnum("verification_status", [
  "draft",
  "submitted",
  "approved",
  "rejected",
  "suspended",
]);
export const licenceStatusEnum = pgEnum("licence_status", ["pending", "verified", "rejected", "expired", "suspended"]);
export const appointmentStatusEnum = pgEnum("appointment_status", [
  "pending_payment",
  "confirmed",
  "checked_in",
  "in_progress",
  "completed",
  "cancelled",
  "doctor_no_show",
  "patient_no_show",
  "expired",
]);
export const consultTypeEnum = pgEnum("consult_type", ["first", "follow_up"]);
export const paymentStatusEnum = pgEnum("payment_status", [
  "created",
  "captured",
  "failed",
  "refunded",
  "partially_refunded",
]);
export const payoutStateEnum = pgEnum("payout_state", ["held", "released", "refunded", "paid_out"]);
export const familyLinkStatusEnum = pgEnum("family_link_status", ["pending_consent", "active", "revoked"]);
export const caseStatusEnum = pgEnum("case_status", [
  "received",
  "under_review",
  "plan_sent",
  "accepted",
  "visa_letter_issued",
  "travel_booked",
  "arrived",
  "in_treatment",
  "discharged",
  "follow_up",
  "closed",
]);
export const complaintStatusEnum = pgEnum("complaint_status", ["open", "acknowledged", "in_progress", "resolved", "closed"]);
export const tpgListEnum = pgEnum("tpg_list", ["O", "A", "B", "prohibited"]);
export const notificationChannelEnum = pgEnum("notification_channel", ["in_app", "sms", "whatsapp", "email", "push"]);
export const notificationStatusEnum = pgEnum("notification_status", ["scheduled", "sent", "failed", "cancelled", "skipped"]);
export const documentCategoryEnum = pgEnum("document_category", [
  "report",
  "scan",
  "prescription",
  "discharge",
  "invoice",
  "photo",
  "recording",
  "visa_letter",
  "handover_letter",
  "treatment_plan",
  "registration_certificate",
  "degree_certificate",
  "government_id",
  "selfie",
  "signature",
  "clinic_photo",
  "verification_evidence",
  "other",
]);

/* ------------------------------------------------------------ identity */

/** Saved display choice. Older rows may still hold keys from removed settings; they are ignored. */
export type UserPreferences = {
  theme?: "light" | "dark";
};

export const users = pgTable(
  "users",
  {
    id: id(),
    role: roleEnum().notNull().default("patient"),
    name: text().notNull().default(""),
    email: text(),
    phone: text(),
    countryCode: text().notNull().default("IN"),
    language: text().notNull().default("en"),
    currency: text().notNull().default("INR"),
    timeZone: text().notNull().default("Asia/Kolkata"),
    status: userStatusEnum().notNull().default("active"),
    onboarded: boolean().notNull().default(false),
    mfaSecretEnc: text(), // AES-GCM encrypted TOTP secret
    mfaEnabledAt: ts(),
    preferences: jsonb().$type<UserPreferences>().notNull().default({}),
    whatsappOptIn: boolean().notNull().default(false),
    lastLoginAt: ts(),
    deletionRequestedAt: ts(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("users_email_uq").on(sql`lower(${t.email})`).where(sql`${t.email} is not null`),
    uniqueIndex("users_phone_uq").on(t.phone).where(sql`${t.phone} is not null`),
  ],
);

export const oauthAccounts = pgTable(
  "oauth_accounts",
  {
    provider: text().notNull(), // google | apple
    providerUserId: text().notNull(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    email: text(),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerUserId] })],
);

export const sessions = pgTable(
  "sessions",
  {
    id: text().primaryKey(), // sha256 of the cookie token
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    mfaVerified: boolean().notNull().default(false),
    createdAt: createdAt(),
    lastSeenAt: ts().notNull().defaultNow(),
    expiresAt: ts().notNull(),
    ip: text(),
    userAgent: text(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const otpCodes = pgTable(
  "otp_codes",
  {
    id: id(),
    identifier: text().notNull(), // normalised phone (+91...) or lower-case email
    purpose: text().notNull().default("login"), // login | family_consent | assisted_booking
    codeHash: text().notNull(),
    attempts: integer().notNull().default(0),
    expiresAt: ts().notNull(),
    consumedAt: ts(),
    meta: jsonb().$type<Record<string, unknown>>(),
    createdAt: createdAt(),
  },
  (t) => [index("otp_identifier_idx").on(t.identifier, t.createdAt)],
);

/* --------------------------------------------------------- reference */

export type EmergencyNumbers = {
  general: string;
  ambulance?: string;
  police?: string;
  crisisLine?: string;
  crisisLineName?: string;
};

export const countries = pgTable("countries", {
  code: text().primaryKey(), // ISO 3166-1 alpha-2
  name: text().notNull(),
  enabled: boolean().notNull().default(false), // users can sign up from here
  localConsultsEnabled: boolean().notNull().default(false), // consults with doctors licensed here
  licenceScope: text().notNull().default("country"), // country | region
  regions: jsonb().$type<{ code: string; name: string }[]>().notNull().default([]),
  currency: text().notNull().default("USD"),
  languages: text().array().notNull().default(sql`'{}'::text[]`),
  timeZones: text().array().notNull().default(sql`'{}'::text[]`),
  phonePrefix: text().notNull().default(""),
  emergency: jsonb().$type<EmergencyNumbers>().notNull(),
  // Treatment-in-India journey options for this country.
  allowPreTravelVideo: boolean().notNull().default(true),
  allowPostReturnFollowUp: text().notNull().default("information_only"), // full | information_only | none
  consentText: text(),
  legalNotes: text(),
  updatedAt: updatedAt(),
});

export const exchangeRates = pgTable(
  "exchange_rates",
  {
    id: id(),
    base: text().notNull().default("INR"),
    quote: text().notNull(),
    rate: doublePrecision().notNull(), // 1 base = rate quote
    asOf: date({ mode: "string" }).notNull(),
    source: text().notNull().default("manual"),
    createdAt: createdAt(),
  },
  (t) => [index("fx_quote_idx").on(t.quote, t.asOf)],
);

export const settings = pgTable("settings", {
  key: text().primaryKey(),
  value: jsonb().notNull(),
  updatedAt: updatedAt(),
});

/* ---------------------------------------------------------- catalogue */

export type Faq = { q: string; a: string };

export const specialties = pgTable("specialties", {
  id: id(),
  slug: text().notNull().unique(),
  name: text().notNull(),
  nameHi: text(),
  icon: text().notNull().default("stethoscope"),
  shortDescription: text().notNull().default(""),
  description: text().notNull().default(""),
  symptoms: text().array().notNull().default(sql`'{}'::text[]`),
  treats: text().array().notNull().default(sql`'{}'::text[]`),
  faqs: jsonb().$type<Faq[]>().notNull().default([]),
  startingFeeMinor: integer().notNull().default(0),
  reviewedByDoctorId: uuid(),
  reviewedAt: ts(),
  sortOrder: integer().notNull().default(100),
  featured: boolean().notNull().default(false),
});

export const conditions = pgTable("conditions", {
  id: id(),
  slug: text().notNull().unique(),
  name: text().notNull(),
  specialtyId: uuid()
    .notNull()
    .references(() => specialties.id),
  summary: text().notNull().default(""),
  body: text().notNull().default(""), // markdown
  symptoms: text().array().notNull().default(sql`'{}'::text[]`),
  whenToSeeDoctor: text().notNull().default(""),
  faqs: jsonb().$type<Faq[]>().notNull().default([]),
  reviewedByDoctorId: uuid(),
  reviewedAt: ts(),
});

/* ---------------------------------------------------- clinics, doctors */

export type ClinicTimings = { day: string; open: string; close: string }[];

export const clinics = pgTable("clinics", {
  id: id(),
  slug: text().notNull().unique(),
  name: text().notNull(),
  kind: text().notNull().default("clinic"), // clinic | hospital
  about: text().notNull().default(""),
  addressLine: text().notNull(),
  city: text().notNull(),
  state: text().notNull(),
  country: text().notNull().default("IN"),
  postcode: text().notNull().default(""),
  lat: doublePrecision(),
  lng: doublePrecision(),
  phone: text(),
  email: text(),
  timeZone: text().notNull().default("Asia/Kolkata"),
  photos: jsonb().$type<{ url: string; alt: string }[]>().notNull().default([]),
  facilities: text().array().notNull().default(sql`'{}'::text[]`),
  accreditations: text().array().notNull().default(sql`'{}'::text[]`),
  timings: jsonb().$type<ClinicTimings>().notNull().default([]),
  gstin: text(),
  acceptsInternational: boolean().notNull().default(false),
  internationalDesk: jsonb().$type<{ phone?: string; email?: string; languages?: string[] }>(),
  emergency24x7: boolean().notNull().default(false),
  verificationStatus: verificationStatusEnum().notNull().default("submitted"),
  verifiedAt: ts(),
  verifiedBy: uuid(),
  createdAt: createdAt(),
});

export const clinicStaff = pgTable(
  "clinic_staff",
  {
    clinicId: uuid()
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text().notNull().default("Coordinator"),
  },
  (t) => [primaryKey({ columns: [t.clinicId, t.userId] })],
);

export type PastPosition = { title: string; place: string; from?: number; to?: number };
export type Award = { title: string; year?: number; by?: string };

export const doctors = pgTable(
  "doctors",
  {
    id: id(),
    userId: uuid().references(() => users.id),
    slug: text().notNull().unique(),
    fullName: text().notNull(),
    gender: sexEnum().notNull(),
    photoUrl: text(),
    avatarSeed: integer().notNull().default(0),
    languages: text().array().notNull().default(sql`'{}'::text[]`),
    specialtyId: uuid()
      .notNull()
      .references(() => specialties.id),
    subSpecialties: text().array().notNull().default(sql`'{}'::text[]`),
    conditionsTreated: text().array().notNull().default(sql`'{}'::text[]`),
    procedures: text().array().notNull().default(sql`'{}'::text[]`),
    experienceYears: integer().notNull().default(0),
    primaryClinicId: uuid().references(() => clinics.id),
    pastPositions: jsonb().$type<PastPosition[]>().notNull().default([]),
    awards: jsonb().$type<Award[]>().notNull().default([]),
    memberships: text().array().notNull().default(sql`'{}'::text[]`),
    publications: text().array().notNull().default(sql`'{}'::text[]`),
    videoIntroUrl: text(),
    about: text().notNull().default(""),
    headline: text().notNull().default(""),
    timeZone: text().notNull().default("Asia/Kolkata"),
    modes: consultModeEnum().array().notNull().default(sql`'{video,audio,chat}'::consult_mode[]`),
    consultMinutes: integer().notNull().default(15),
    chatResponseMinutes: integer().notNull().default(30),
    followUpChatDays: integer().notNull().default(3),
    acceptsInstant: boolean().notNull().default(false),
    availableNowUntil: ts(), // instant-consult availability heartbeat
    offersSecondOpinion: boolean().notNull().default(false),
    creditOnlineFeeToClinic: boolean().notNull().default(true),
    signatureDocumentId: uuid(),
    verificationStatus: verificationStatusEnum().notNull().default("draft"),
    submittedAt: ts(),
    lastVerifiedAt: ts(),
    lastVerifiedBy: uuid(),
    reverifyDueAt: ts(),
    rejectionReason: text(),
    ratingAvg: numeric({ precision: 3, scale: 2, mode: "number" }).notNull().default(0),
    ratingCount: integer().notNull().default(0),
    consultCount: integer().notNull().default(0),
    payoutDetails: jsonb().$type<{ accountName?: string; bankLast4?: string; ifsc?: string; upi?: string; pan?: string }>(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("doctors_specialty_idx").on(t.specialtyId), index("doctors_status_idx").on(t.verificationStatus)],
);

export const doctorQualifications = pgTable("doctor_qualifications", {
  id: id(),
  doctorId: uuid()
    .notNull()
    .references(() => doctors.id, { onDelete: "cascade" }),
  degree: text().notNull(),
  institution: text().notNull(),
  year: integer().notNull(),
  documentId: uuid(),
});

export const doctorLicences = pgTable(
  "doctor_licences",
  {
    id: id(),
    doctorId: uuid()
      .notNull()
      .references(() => doctors.id, { onDelete: "cascade" }),
    country: text().notNull(),
    region: text(), // state / province where licensing is regional (e.g. US-NY)
    number: text().notNull(),
    issuingBody: text().notNull(),
    issuedAt: date({ mode: "string" }),
    expiresAt: date({ mode: "string" }),
    status: licenceStatusEnum().notNull().default("pending"),
    verifiedBy: uuid(),
    verifiedAt: ts(),
    verificationReference: text(),
    evidenceDocumentId: uuid(),
    certificateDocumentId: uuid(),
    notes: text(),
    remindersSent: jsonb().$type<string[]>().notNull().default([]),
    createdAt: createdAt(),
  },
  (t) => [index("licences_doctor_idx").on(t.doctorId), index("licences_location_idx").on(t.country, t.region)],
);

export const doctorFees = pgTable(
  "doctor_fees",
  {
    doctorId: uuid()
      .notNull()
      .references(() => doctors.id, { onDelete: "cascade" }),
    mode: consultModeEnum().notNull(),
    currency: text().notNull(),
    amountMinor: integer().notNull(),
  },
  (t) => [primaryKey({ columns: [t.doctorId, t.mode, t.currency] })],
);

export const doctorClinicLinks = pgTable(
  "doctor_clinic_links",
  {
    doctorId: uuid()
      .notNull()
      .references(() => doctors.id, { onDelete: "cascade" }),
    clinicId: uuid()
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),
    role: text().notNull().default("Consultant"),
    inClinicFeeMinor: integer().notNull().default(0),
    active: boolean().notNull().default(true),
  },
  (t) => [primaryKey({ columns: [t.doctorId, t.clinicId] })],
);

/** Weekly templates. Slots are materialised from these for the next weeks. */
export const availabilityRules = pgTable("availability_rules", {
  id: id(),
  doctorId: uuid()
    .notNull()
    .references(() => doctors.id, { onDelete: "cascade" }),
  group: slotGroupEnum().notNull(),
  clinicId: uuid().references(() => clinics.id),
  weekday: integer().notNull(), // 0 = Sunday, in the rule's time zone
  startTime: text().notNull(), // "09:00"
  endTime: text().notNull(), // "13:00"
  slotMinutes: integer().notNull().default(15),
  timeZone: text().notNull(),
  active: boolean().notNull().default(true),
  createdAt: createdAt(),
});

export const availabilitySlots = pgTable(
  "availability_slots",
  {
    id: id(),
    doctorId: uuid()
      .notNull()
      .references(() => doctors.id, { onDelete: "cascade" }),
    ruleId: uuid(),
    group: slotGroupEnum().notNull(),
    clinicId: uuid().references(() => clinics.id),
    startAt: ts().notNull(),
    endAt: ts().notNull(),
    timeZone: text().notNull(),
    status: slotStatusEnum().notNull().default("open"),
    heldUntil: ts(),
    appointmentId: uuid(),
  },
  (t) => [
    uniqueIndex("slots_doctor_start_uq").on(t.doctorId, t.group, t.startAt),
    index("slots_lookup_idx").on(t.doctorId, t.status, t.startAt),
  ],
);

/* ------------------------------------------------------ patients, family */

export type EmergencyContact = { name: string; phone: string; relationship?: string };

export const patients = pgTable(
  "patients",
  {
    id: id(),
    userId: uuid().references(() => users.id), // set when the patient has their own login
    ownerUserId: uuid()
      .notNull()
      .references(() => users.id), // account that created the profile
    fullName: text().notNull(),
    dob: date({ mode: "string" }),
    sex: sexEnum(),
    phone: text(),
    email: text(),
    country: text().notNull().default("IN"),
    city: text(),
    bloodGroup: text(),
    heightCm: integer(),
    weightKg: numeric({ precision: 5, scale: 1, mode: "number" }),
    allergies: text().array().notNull().default(sql`'{}'::text[]`),
    conditions: text().array().notNull().default(sql`'{}'::text[]`),
    currentMedicines: text().array().notNull().default(sql`'{}'::text[]`),
    emergencyContact: jsonb().$type<EmergencyContact>(),
    preferredLanguage: text(),
    abhaAddress: text(),
    abhaLinkedAt: ts(),
    emergencyCardToken: text(),
    emergencyCardEnabled: boolean().notNull().default(false),
    deletedAt: ts(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("patients_user_idx").on(t.userId), index("patients_owner_idx").on(t.ownerUserId)],
);

export const familyLinks = pgTable(
  "family_links",
  {
    id: id(),
    caregiverUserId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    patientId: uuid()
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    relationship: text().notNull(), // mother, father, spouse, child...
    status: familyLinkStatusEnum().notNull().default("pending_consent"),
    consentMethod: text(), // otp | patient_account | guardian_declaration | self
    consentAt: ts(),
    canBook: boolean().notNull().default(true),
    canJoin: boolean().notNull().default(true),
    canViewRecords: boolean().notNull().default(true),
    receivesNotifications: boolean().notNull().default(true),
    revokedAt: ts(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("family_link_uq").on(t.caregiverUserId, t.patientId)],
);

/* --------------------------------------------------------- appointments */

export const careJourneys = pgTable("care_journeys", {
  id: id(),
  patientId: uuid()
    .notNull()
    .references(() => patients.id),
  title: text().notNull(),
  status: text().notNull().default("open"), // open | closed
  createdAt: createdAt(),
});

export type PreConsultForm = {
  mainProblem: string;
  since: string;
  currentMedicines: string;
  allergies: string;
  pastConditions: string;
  questions?: string;
  shareHistory: boolean;
  documentIds: string[];
  consentGiven: boolean;
  submittedAt: string;
};

export type TriageResult = {
  answers: Record<string, string | string[] | boolean>;
  specialtySlug?: string;
  urgency: "emergency" | "now" | "today" | "this_week";
  redFlags: string[];
  completedAt: string;
};

export type RecordingConsent = { requestedBy?: string; doctor?: boolean; patient?: boolean; startedAt?: string; stoppedAt?: string };

export const appointments = pgTable(
  "appointments",
  {
    id: id(),
    ref: text().notNull().unique(),
    patientId: uuid()
      .notNull()
      .references(() => patients.id),
    bookedByUserId: uuid()
      .notNull()
      .references(() => users.id),
    bookedByRole: text().notNull().default("patient"), // patient | caregiver | care_coordinator | doctor
    doctorId: uuid()
      .notNull()
      .references(() => doctors.id),
    clinicId: uuid().references(() => clinics.id),
    slotId: uuid(),
    journeyId: uuid().references(() => careJourneys.id),
    parentAppointmentId: uuid(), // online consult that led to this clinic visit
    followUpOfId: uuid(),
    mode: consultModeEnum().notNull(),
    kind: text().notNull().default("scheduled"), // scheduled | instant
    consultType: consultTypeEnum().notNull().default("first"),
    status: appointmentStatusEnum().notNull().default("pending_payment"),
    startAt: ts().notNull(),
    endAt: ts().notNull(),
    doctorTimeZone: text().notNull(),
    patientTimeZone: text().notNull(),
    // Where the patient is during the consult. This decides which rules and
    // which doctor licences apply.
    patientLocationCountry: text().notNull(),
    patientLocationRegion: text(),
    locationConfirmedAt: ts(),
    locationSource: text(), // self_declared | device | ip
    chiefComplaint: text(),
    preConsult: jsonb().$type<PreConsultForm>(),
    triage: jsonb().$type<TriageResult>(),
    interpreterLanguage: text(),
    interpreterId: uuid(),
    // Price shown and charged, in the patient's currency.
    currency: text().notNull().default("INR"),
    feeMinor: integer().notNull().default(0),
    platformFeeMinor: integer().notNull().default(0),
    taxMinor: integer().notNull().default(0),
    discountMinor: integer().notNull().default(0),
    creditMinor: integer().notNull().default(0), // online fee credited to a clinic visit
    totalMinor: integer().notNull().default(0),
    paymentMode: text().notNull().default("online"), // online | at_clinic | plan | free_follow_up
    couponId: uuid(),
    subscriptionId: uuid(),
    policySnapshot: jsonb().$type<{ refund: string; reschedule: string; consultMinutes: number }>(),
    queueJoinedAt: ts(),
    patientJoinedAt: ts(),
    doctorJoinedAt: ts(),
    startedAt: ts(),
    endedAt: ts(),
    endedBy: text(),
    outcome: text(), // completed | needs_in_person | referred | emergency | ended_early
    cancelledAt: ts(),
    cancelledBy: text(),
    cancelReason: text(),
    rescheduledFromId: uuid(),
    followUpChatUntil: ts(),
    recording: jsonb().$type<RecordingConsent>(),
    visitPassTokenHash: text(),
    visitPassCode: text(),
    checkedInAt: ts(),
    checkedInBy: uuid(),
    doctorRunningLateMinutes: integer().notNull().default(0),
    identityConfirmedAt: ts(),
    guardianPresent: jsonb().$type<{ name: string; relationship: string }>(),
    explicitConsentAt: ts(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("appt_patient_idx").on(t.patientId, t.startAt),
    index("appt_doctor_idx").on(t.doctorId, t.startAt),
    index("appt_status_idx").on(t.status, t.startAt),
    index("appt_clinic_idx").on(t.clinicId, t.startAt),
    // A doctor can never be double-booked for the same start time.
    uniqueIndex("appt_doctor_start_active_uq")
      .on(t.doctorId, t.startAt)
      .where(sql`${t.status} in ('pending_payment','confirmed','checked_in','in_progress') and ${t.kind} = 'scheduled'`),
  ],
);

export const appointmentInvites = pgTable("appointment_invites", {
  id: id(),
  appointmentId: uuid()
    .notNull()
    .references(() => appointments.id, { onDelete: "cascade" }),
  role: text().notNull(), // caregiver | interpreter
  name: text().notNull(),
  contact: text(),
  tokenHash: text().notNull().unique(),
  createdByUserId: uuid().notNull(),
  expiresAt: ts().notNull(),
  usedAt: ts(),
  revokedAt: ts(),
  createdAt: createdAt(),
});

/** Doctor's actions during a consult: in-person visit, referral, tests... */
export const consultActions = pgTable(
  "consult_actions",
  {
    id: id(),
    appointmentId: uuid()
      .notNull()
      .references(() => appointments.id, { onDelete: "cascade" }),
    patientId: uuid().notNull(),
    doctorId: uuid().notNull(),
    type: text().notNull(), // in_person_visit | specialist_referral | tests | emergency | follow_up
    details: jsonb().$type<Record<string, unknown>>().notNull().default({}),
    targetDoctorId: uuid(),
    targetClinicId: uuid(),
    targetSpecialtyId: uuid(),
    dueBy: date({ mode: "string" }),
    status: text().notNull().default("open"), // open | booked | done | dismissed
    bookedAppointmentId: uuid(),
    createdAt: createdAt(),
  },
  (t) => [index("actions_patient_idx").on(t.patientId, t.status)],
);

export const roomParticipants = pgTable(
  "room_participants",
  {
    peerId: text().primaryKey(),
    appointmentId: uuid()
      .notNull()
      .references(() => appointments.id, { onDelete: "cascade" }),
    userId: uuid(),
    inviteId: uuid(),
    role: text().notNull(), // patient | caregiver | doctor | interpreter | clinic
    displayName: text().notNull(),
    media: jsonb().$type<{ audio: boolean; video: boolean; screen?: boolean; lowBandwidth?: boolean }>().notNull().default({ audio: true, video: true }),
    joinedAt: ts().notNull().defaultNow(),
    lastSeenAt: ts().notNull().defaultNow(),
    leftAt: ts(),
  },
  (t) => [index("room_appt_idx").on(t.appointmentId)],
);

export const signals = pgTable(
  "signals",
  {
    id: bigserial({ mode: "number" }).primaryKey(),
    appointmentId: uuid().notNull(),
    fromPeer: text().notNull(),
    toPeer: text().notNull(),
    kind: text().notNull(), // description | candidate | bye
    payload: jsonb().notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("signals_to_idx").on(t.toPeer, t.id)],
);

export const messages = pgTable(
  "messages",
  {
    id: bigserial({ mode: "number" }).primaryKey(),
    appointmentId: uuid().references(() => appointments.id, { onDelete: "cascade" }),
    caseId: uuid(),
    patientId: uuid().notNull(),
    senderUserId: uuid(),
    senderRole: text().notNull(), // patient | caregiver | doctor | interpreter | system | coordinator
    senderName: text().notNull(),
    body: text().notNull().default(""),
    documentId: uuid(),
    kind: text().notNull().default("text"), // text | file | system
    createdAt: createdAt(),
    readAt: ts(),
  },
  (t) => [index("messages_appt_idx").on(t.appointmentId, t.id), index("messages_case_idx").on(t.caseId, t.id)],
);

export const consultNotes = pgTable("consult_notes", {
  id: id(),
  appointmentId: uuid()
    .notNull()
    .unique()
    .references(() => appointments.id, { onDelete: "cascade" }),
  patientId: uuid().notNull(),
  doctorId: uuid().notNull(),
  complaint: text().notNull().default(""),
  history: text().notNull().default(""),
  findings: text().notNull().default(""),
  diagnosis: text().notNull().default(""),
  provisional: boolean().notNull().default(true),
  advice: text().notNull().default(""),
  investigations: text().array().notNull().default(sql`'{}'::text[]`),
  warningSigns: text().notNull().default(""),
  patientSummary: text().notNull().default(""),
  privateNotes: text().notNull().default(""),
  followUpDate: date({ mode: "string" }),
  finalisedAt: ts(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/* ---------------------------------------------------------- prescribing */

export const medicines = pgTable(
  "medicines",
  {
    id: id(),
    genericName: text().notNull(),
    brandExamples: text().array().notNull().default(sql`'{}'::text[]`),
    form: text().notNull(), // tablet, capsule, syrup, cream, drops, inhaler...
    strengths: text().array().notNull().default(sql`'{}'::text[]`),
    drugClass: text().notNull(),
    tpgList: tpgListEnum().notNull(),
    schedule: text(), // OTC, H, H1, X, NDPS
    notes: text(),
  },
  (t) => [index("medicines_name_idx").on(t.genericName)],
);

export const prescriptions = pgTable("prescriptions", {
  id: id(),
  number: text().notNull().unique(),
  appointmentId: uuid()
    .notNull()
    .references(() => appointments.id),
  patientId: uuid().notNull(),
  doctorId: uuid().notNull(),
  consultMode: consultModeEnum().notNull(),
  consultType: consultTypeEnum().notNull(),
  diagnosis: text().notNull(),
  provisional: boolean().notNull().default(true),
  advice: text().notNull().default(""),
  investigations: text().array().notNull().default(sql`'{}'::text[]`),
  followUpDate: date({ mode: "string" }),
  // Snapshot of what was printed (doctor, patient, clinic) so the PDF and the
  // verification page stay identical even if a profile changes later.
  snapshot: jsonb().$type<Record<string, unknown>>().notNull(),
  signature: text().notNull(), // Ed25519 signature (base64url) over the canonical payload
  payloadHash: text().notNull(),
  status: text().notNull().default("issued"), // issued | cancelled
  cancelledReason: text(),
  issuedAt: ts().notNull().defaultNow(),
  verifyCount: integer().notNull().default(0),
});

export const prescriptionItems = pgTable("prescription_items", {
  id: id(),
  prescriptionId: uuid()
    .notNull()
    .references(() => prescriptions.id, { onDelete: "cascade" }),
  patientId: uuid().notNull(),
  medicineId: uuid(),
  name: text().notNull(),
  form: text().notNull().default("tablet"),
  strength: text().notNull().default(""),
  dose: text().notNull(), // "1 tablet"
  frequency: text().notNull(), // "1-0-1" (morning-afternoon-night)
  timing: text().notNull().default("after_food"),
  durationDays: integer().notNull(),
  instructions: text().notNull().default(""),
  tpgList: tpgListEnum().notNull(),
  sortOrder: integer().notNull().default(0),
});

/* ------------------------------------------------------------- records */

export const documents = pgTable(
  "documents",
  {
    id: id(),
    patientId: uuid(),
    doctorId: uuid(),
    clinicId: uuid(),
    caseId: uuid(),
    appointmentId: uuid(),
    uploadedByUserId: uuid(),
    category: documentCategoryEnum().notNull(),
    title: text().notNull(),
    fileName: text().notNull(),
    mimeType: text().notNull(),
    sizeBytes: integer().notNull(),
    storageKey: text().notNull(),
    sha256: text().notNull(),
    reportDate: date({ mode: "string" }),
    source: text().notNull().default("upload"), // upload | generated | abha | partner
    deletedAt: ts(),
    createdAt: createdAt(),
  },
  (t) => [
    index("documents_patient_idx").on(t.patientId, t.createdAt),
    index("documents_appt_idx").on(t.appointmentId),
    index("documents_case_idx").on(t.caseId),
  ],
);

export const shareLinks = pgTable("share_links", {
  id: id(),
  patientId: uuid()
    .notNull()
    .references(() => patients.id, { onDelete: "cascade" }),
  createdByUserId: uuid().notNull(),
  tokenHash: text().notNull().unique(),
  documentIds: uuid().array().notNull(),
  includeSummary: boolean().notNull().default(false),
  recipientNote: text(),
  expiresAt: ts().notNull(),
  revokedAt: ts(),
  accessCount: integer().notNull().default(0),
  lastAccessAt: ts(),
  createdAt: createdAt(),
});

/** Patient consent for a doctor to see their history beyond one consult. */
export const recordAccessGrants = pgTable("record_access_grants", {
  id: id(),
  patientId: uuid()
    .notNull()
    .references(() => patients.id, { onDelete: "cascade" }),
  doctorId: uuid()
    .notNull()
    .references(() => doctors.id, { onDelete: "cascade" }),
  appointmentId: uuid(),
  grantedByUserId: uuid().notNull(),
  scope: text().notNull().default("history"),
  expiresAt: ts().notNull(),
  revokedAt: ts(),
  createdAt: createdAt(),
});

/* -------------------------------------------------------------- payments */

export type TaxLine = { label: string; rate: number; amountMinor: number; sac?: string };

export const payments = pgTable(
  "payments",
  {
    id: id(),
    userId: uuid()
      .notNull()
      .references(() => users.id),
    patientId: uuid(),
    appointmentId: uuid(),
    caseId: uuid(),
    subscriptionId: uuid(),
    secondOpinionId: uuid(),
    purpose: text().notNull(), // consult | clinic_visit | case_deposit | case_final | plan | second_opinion
    gateway: text().notNull(), // demo | razorpay | stripe
    gatewayOrderId: text(),
    gatewayPaymentId: text(),
    method: text(), // upi | card | netbanking | wallet | intl_card
    currency: text().notNull(),
    amountMinor: integer().notNull(),
    feeMinor: integer().notNull().default(0),
    platformFeeMinor: integer().notNull().default(0),
    taxMinor: integer().notNull().default(0),
    discountMinor: integer().notNull().default(0),
    taxLines: jsonb().$type<TaxLine[]>().notNull().default([]),
    fxRate: doublePrecision(), // INR -> currency used for this payment
    fxAsOf: date({ mode: "string" }),
    status: paymentStatusEnum().notNull().default("created"),
    payoutState: payoutStateEnum().notNull().default("held"),
    refundedMinor: integer().notNull().default(0),
    invoiceNumber: text().unique(),
    invoiceIssuedAt: ts(),
    billing: jsonb().$type<{ name: string; email?: string; phone?: string; gstin?: string; state?: string; country: string }>(),
    capturedAt: ts(),
    failureReason: text(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("payments_appt_idx").on(t.appointmentId), index("payments_user_idx").on(t.userId, t.createdAt)],
);

export const refunds = pgTable("refunds", {
  id: id(),
  paymentId: uuid()
    .notNull()
    .references(() => payments.id),
  amountMinor: integer().notNull(),
  currency: text().notNull(),
  reason: text().notNull(),
  initiatedBy: text().notNull(), // system | admin | patient | doctor
  initiatedByUserId: uuid(),
  status: text().notNull().default("processed"), // pending | processed | failed
  gatewayRefundId: text(),
  createdAt: createdAt(),
});

export const coupons = pgTable("coupons", {
  id: id(),
  code: text().notNull().unique(),
  description: text().notNull().default(""),
  kind: text().notNull(), // percent | flat
  value: integer().notNull(), // percent (0-100) or flat minor units in INR
  maxDiscountMinor: integer(),
  maxUses: integer(),
  usedCount: integer().notNull().default(0),
  validFrom: ts(),
  validUntil: ts(),
  firstConsultOnly: boolean().notNull().default(false),
  active: boolean().notNull().default(true),
  createdAt: createdAt(),
});

export const plans = pgTable("plans", {
  id: id(),
  slug: text().notNull().unique(),
  name: text().notNull(),
  kind: text().notNull(), // family | chronic
  condition: text(), // diabetes | blood_pressure | thyroid
  priceMinor: integer().notNull(),
  currency: text().notNull().default("INR"),
  interval: text().notNull().default("month"),
  consultsPerMonth: integer().notNull().default(0),
  membersAllowed: integer().notNull().default(1),
  features: text().array().notNull().default(sql`'{}'::text[]`),
  readingTypes: text().array().notNull().default(sql`'{}'::text[]`),
  active: boolean().notNull().default(true),
  sortOrder: integer().notNull().default(0),
});

export const subscriptions = pgTable("subscriptions", {
  id: id(),
  userId: uuid()
    .notNull()
    .references(() => users.id),
  planId: uuid()
    .notNull()
    .references(() => plans.id),
  patientIds: uuid().array().notNull(),
  status: text().notNull().default("active"), // active | cancelled | expired
  periodStart: ts().notNull(),
  periodEnd: ts().notNull(),
  consultsUsed: integer().notNull().default(0),
  careDoctorId: uuid(),
  nextCheckInAt: ts(),
  createdAt: createdAt(),
});

export const payouts = pgTable("payouts", {
  id: id(),
  doctorId: uuid()
    .notNull()
    .references(() => doctors.id),
  periodStart: date({ mode: "string" }).notNull(),
  periodEnd: date({ mode: "string" }).notNull(),
  grossMinor: integer().notNull(),
  commissionMinor: integer().notNull(),
  tdsMinor: integer().notNull().default(0),
  netMinor: integer().notNull(),
  consults: integer().notNull(),
  status: text().notNull().default("scheduled"), // scheduled | paid
  paidAt: ts(),
  reference: text(),
  createdAt: createdAt(),
});

/* ------------------------------------------------------- reviews, alerts */

export const reviews = pgTable(
  "reviews",
  {
    id: id(),
    appointmentId: uuid()
      .notNull()
      .unique()
      .references(() => appointments.id),
    doctorId: uuid()
      .notNull()
      .references(() => doctors.id),
    patientId: uuid().notNull(),
    authorUserId: uuid().notNull(),
    authorDisplayName: text().notNull(),
    rating: integer().notNull(),
    text: text().notNull().default(""),
    tags: text().array().notNull().default(sql`'{}'::text[]`),
    doctorReply: text(),
    repliedAt: ts(),
    status: text().notNull().default("published"), // published | hidden | flagged
    createdAt: createdAt(),
  },
  (t) => [index("reviews_doctor_idx").on(t.doctorId, t.createdAt)],
);

export const notifications = pgTable(
  "notifications",
  {
    id: id(),
    userId: uuid().references(() => users.id, { onDelete: "cascade" }),
    to: text(), // phone or email when the recipient has no account
    channel: notificationChannelEnum().notNull(),
    template: text().notNull(),
    title: text().notNull(),
    body: text().notNull(),
    link: text(),
    payload: jsonb().$type<Record<string, unknown>>().notNull().default({}),
    appointmentId: uuid(),
    sendAt: ts().notNull().defaultNow(),
    sentAt: ts(),
    readAt: ts(),
    status: notificationStatusEnum().notNull().default("scheduled"),
    error: text(),
    dedupeKey: text().unique(),
    createdAt: createdAt(),
  },
  (t) => [index("notifications_due_idx").on(t.status, t.sendAt), index("notifications_user_idx").on(t.userId, t.createdAt)],
);

export const pushSubscriptions = pgTable("push_subscriptions", {
  endpoint: text().primaryKey(),
  userId: uuid()
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  keys: jsonb().$type<{ p256dh: string; auth: string }>().notNull(),
  createdAt: createdAt(),
});

/* ------------------------------------------------------------- consent */

export const consents = pgTable(
  "consents",
  {
    id: id(),
    userId: uuid(),
    patientId: uuid(),
    appointmentId: uuid(),
    // terms | privacy | telemedicine | records_sharing | whatsapp | marketing |
    // research | recording | caregiver_booking | abha | international_data_transfer
    type: text().notNull(),
    version: text().notNull(),
    granted: boolean().notNull(),
    method: text().notNull(), // checkbox | implied | explicit_verbal | otp | toggle
    recordedByUserId: uuid(),
    textHash: text(),
    ip: text(),
    createdAt: createdAt(),
  },
  (t) => [index("consents_user_idx").on(t.userId, t.type, t.createdAt)],
);

/* --------------------------------------------------- international cases */

export type CaseTravel = {
  arrivalDate?: string;
  departureDate?: string;
  attendants?: { name: string; relationship: string; passportCountry?: string }[];
  stay?: { option?: string; name?: string; address?: string; nightlyMinor?: number; currency?: string; booked?: boolean };
  airportPickup?: { requested: boolean; flight?: string; booked?: boolean };
  localSim?: boolean;
  interpreterLanguage?: string;
  foodPreferences?: string;
  notes?: string;
};

export const internationalCases = pgTable(
  "international_cases",
  {
    id: id(),
    ref: text().notNull().unique(),
    patientId: uuid()
      .notNull()
      .references(() => patients.id),
    createdByUserId: uuid()
      .notNull()
      .references(() => users.id),
    homeCountry: text().notNull(),
    currency: text().notNull(),
    specialtyId: uuid(),
    treatmentInterest: text().notNull(),
    description: text().notNull(),
    preferredClinicId: uuid(),
    assignedClinicId: uuid(),
    assignedDoctorId: uuid(),
    coordinatorUserId: uuid(),
    status: caseStatusEnum().notNull().default("received"),
    preferredLanguage: text(),
    travel: jsonb().$type<CaseTravel>().notNull().default({}),
    depositMinor: integer(),
    finalBillMinor: integer(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("cases_clinic_idx").on(t.assignedClinicId, t.status)],
);

export const caseEvents = pgTable(
  "case_events",
  {
    id: id(),
    caseId: uuid()
      .notNull()
      .references(() => internationalCases.id, { onDelete: "cascade" }),
    status: caseStatusEnum(),
    note: text().notNull(),
    visibleToPatient: boolean().notNull().default(true),
    actorUserId: uuid(),
    actorRole: text(),
    createdAt: createdAt(),
  },
  (t) => [index("case_events_idx").on(t.caseId, t.createdAt)],
);

export const caseEstimates = pgTable("case_estimates", {
  id: id(),
  caseId: uuid()
    .notNull()
    .references(() => internationalCases.id, { onDelete: "cascade" }),
  clinicId: uuid().notNull(),
  doctorId: uuid(),
  recommendedTreatment: text().notNull(),
  rationale: text().notNull().default(""),
  hospitalDays: integer().notNull(),
  indiaDays: integer().notNull(),
  costMinInrMinor: integer().notNull(),
  costMaxInrMinor: integer().notNull(),
  currency: text().notNull(),
  costMinMinor: integer().notNull(),
  costMaxMinor: integer().notNull(),
  fxRate: doublePrecision().notNull(),
  fxAsOf: date({ mode: "string" }).notNull(),
  inclusions: text().array().notNull().default(sql`'{}'::text[]`),
  exclusions: text().array().notNull().default(sql`'{}'::text[]`),
  documentsNeeded: text().array().notNull().default(sql`'{}'::text[]`),
  depositMinor: integer().notNull().default(0),
  validUntil: date({ mode: "string" }).notNull(),
  status: text().notNull().default("sent"), // draft | sent | accepted | declined | superseded
  sentAt: ts(),
  respondedAt: ts(),
  createdByUserId: uuid(),
  createdAt: createdAt(),
});

export const visaLetters = pgTable("visa_letters", {
  id: id(),
  caseId: uuid()
    .notNull()
    .references(() => internationalCases.id, { onDelete: "cascade" }),
  clinicId: uuid().notNull(),
  letterNumber: text().notNull().unique(),
  patientName: text().notNull(),
  passportNumberEnc: text().notNull(),
  nationality: text().notNull(),
  attendants: jsonb().$type<{ name: string; relationship: string; passportNumberEnc: string; nationality: string }[]>().notNull().default([]),
  treatment: text().notNull(),
  expectedAdmission: date({ mode: "string" }),
  expectedDays: integer(),
  documentId: uuid(),
  issuedByUserId: uuid().notNull(),
  issuedAt: ts().notNull().defaultNow(),
});

/* ------------------------------------------------------------- support */

export type ComplaintUpdate = { at: string; by: string; note: string; status?: string; public: boolean };

export const complaints = pgTable(
  "complaints",
  {
    id: id(),
    ref: text().notNull().unique(),
    userId: uuid(),
    name: text().notNull(),
    contact: text().notNull(),
    appointmentId: uuid(),
    category: text().notNull(), // consult | doctor | payment | refund | privacy | technical | other
    subject: text().notNull(),
    description: text().notNull(),
    status: complaintStatusEnum().notNull().default("open"),
    assignedToUserId: uuid(),
    acknowledgeBy: ts().notNull(),
    resolveBy: ts().notNull(),
    acknowledgedAt: ts(),
    resolvedAt: ts(),
    resolution: text(),
    updates: jsonb().$type<ComplaintUpdate[]>().notNull().default([]),
    createdAt: createdAt(),
  },
  (t) => [index("complaints_status_idx").on(t.status, t.createdAt)],
);

export const callbackRequests = pgTable("callback_requests", {
  id: id(),
  userId: uuid(),
  name: text().notNull(),
  phone: text().notNull(),
  language: text().notNull().default("en"),
  reason: text().notNull(), // booking_help | payment | technical | international | other
  note: text(),
  preferredTime: text(),
  status: text().notNull().default("open"), // open | in_progress | done
  assignedToUserId: uuid(),
  outcome: text(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const interpreters = pgTable("interpreters", {
  id: id(),
  name: text().notNull(),
  languages: text().array().notNull(),
  phone: text(),
  email: text(),
  medicalCertified: boolean().notNull().default(true),
  active: boolean().notNull().default(true),
});

export const articles = pgTable("articles", {
  id: id(),
  slug: text().notNull().unique(),
  title: text().notNull(),
  summary: text().notNull(),
  body: text().notNull(), // markdown
  category: text().notNull(),
  language: text().notNull().default("en"),
  specialtyId: uuid(),
  reviewedByDoctorId: uuid(),
  reviewedAt: ts(),
  readMinutes: integer().notNull().default(4),
  published: boolean().notNull().default(false),
  publishedAt: ts(),
  updatedAt: updatedAt(),
});

export const secondOpinions = pgTable("second_opinions", {
  id: id(),
  ref: text().notNull().unique(),
  patientId: uuid()
    .notNull()
    .references(() => patients.id),
  requestedByUserId: uuid().notNull(),
  specialtyId: uuid().notNull(),
  doctorId: uuid(),
  patientLocationCountry: text().notNull(),
  patientLocationRegion: text(),
  question: text().notNull(),
  history: text().notNull().default(""),
  documentIds: uuid().array().notNull().default(sql`'{}'::uuid[]`),
  status: text().notNull().default("pending_payment"), // pending_payment | submitted | assigned | answered | cancelled
  dueAt: ts(),
  opinion: text(),
  recommendations: text(),
  answeredAt: ts(),
  currency: text().notNull().default("INR"),
  feeMinor: integer().notNull().default(0),
  createdAt: createdAt(),
});

export const partnerOrders = pgTable("partner_orders", {
  id: id(),
  kind: text().notNull(), // pharmacy | lab
  partner: text().notNull(),
  patientId: uuid().notNull(),
  userId: uuid().notNull(),
  prescriptionId: uuid(),
  appointmentId: uuid(),
  items: jsonb().$type<{ name: string; qty?: string }[]>().notNull().default([]),
  address: text(),
  status: text().notNull().default("placed"), // placed | confirmed | dispatched | delivered | sample_collected | report_ready | cancelled
  externalRef: text(),
  createdAt: createdAt(),
});

export const readings = pgTable(
  "readings",
  {
    id: id(),
    patientId: uuid()
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    type: text().notNull(), // bp | glucose_fasting | glucose_post_meal | weight | pulse | spo2 | temperature | tsh
    value: doublePrecision().notNull(),
    value2: doublePrecision(), // diastolic for bp
    unit: text().notNull(),
    takenAt: ts().notNull(),
    note: text(),
    recordedByUserId: uuid(),
    createdAt: createdAt(),
  },
  (t) => [index("readings_patient_idx").on(t.patientId, t.type, t.takenAt)],
);

export const medicineReminders = pgTable("medicine_reminders", {
  id: id(),
  patientId: uuid()
    .notNull()
    .references(() => patients.id, { onDelete: "cascade" }),
  prescriptionItemId: uuid(),
  name: text().notNull(),
  dose: text().notNull(),
  times: text().array().notNull(), // ["08:00","20:00"] in the patient's time zone
  timeZone: text().notNull(),
  startDate: date({ mode: "string" }).notNull(),
  endDate: date({ mode: "string" }),
  refillAlertDate: date({ mode: "string" }),
  instructions: text(),
  active: boolean().notNull().default(true),
  createdAt: createdAt(),
});

export const doseLogs = pgTable(
  "dose_logs",
  {
    id: id(),
    reminderId: uuid()
      .notNull()
      .references(() => medicineReminders.id, { onDelete: "cascade" }),
    scheduledFor: ts().notNull(),
    status: text().notNull(), // taken | skipped
    loggedAt: ts().notNull().defaultNow(),
  },
  (t) => [uniqueIndex("dose_log_uq").on(t.reminderId, t.scheduledFor)],
);

export const savedDoctors = pgTable(
  "saved_doctors",
  {
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    doctorId: uuid()
      .notNull()
      .references(() => doctors.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.doctorId] })],
);

export const dataRequests = pgTable("data_requests", {
  id: id(),
  userId: uuid().notNull(),
  kind: text().notNull(), // access | deletion | correction
  status: text().notNull().default("open"), // open | completed | rejected
  note: text(),
  dueAt: ts().notNull(),
  completedAt: ts(),
  createdAt: createdAt(),
});

export const securityIncidents = pgTable("security_incidents", {
  id: id(),
  title: text().notNull(),
  description: text().notNull(),
  severity: text().notNull(), // low | medium | high | critical
  detectedAt: ts().notNull(),
  containedAt: ts(),
  affectedUsers: integer().notNull().default(0),
  reportedToBoardAt: ts(),
  usersNotifiedAt: ts(),
  status: text().notNull().default("open"),
  createdByUserId: uuid().notNull(),
  createdAt: createdAt(),
});

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: bigserial({ mode: "number" }).primaryKey(),
    actorUserId: uuid(),
    actorRole: text(),
    action: text().notNull(), // e.g. record.view, prescription.issue, doctor.verify
    entityType: text().notNull(),
    entityId: text(),
    patientId: uuid(),
    ip: text(),
    userAgent: text(),
    metadata: jsonb().$type<Record<string, unknown>>().notNull().default({}),
    createdAt: createdAt(),
  },
  (t) => [
    index("audit_patient_idx").on(t.patientId, t.createdAt),
    index("audit_actor_idx").on(t.actorUserId, t.createdAt),
    index("audit_entity_idx").on(t.entityType, t.entityId),
  ],
);
