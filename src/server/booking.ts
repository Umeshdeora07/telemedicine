import "server-only";
import { UserError } from "@/lib/errors";
import { and, desc, eq, gt, inArray, lt, sql } from "drizzle-orm";
import { getDb, type Executor } from "@/db";
import {
  appointments,
  availabilitySlots,
  careJourneys,
  consents as consentsTable,
  consultActions,
  coupons,
  doctorClinicLinks,
  doctorFees,
  doctors,
  familyLinks,
  patients,
  payments,
  plans,
  refunds,
  settings,
  subscriptions,
  users,
} from "@/db/schema";
import { formatMoney } from "@/lib/format";
import { env } from "@/config/env";
import { brand } from "@/config/brand";
import { isCurrency, type Currency } from "@/config/currencies";
import { buildQuote, feeFor } from "@/lib/pricing";
import { financialYear, refs } from "@/lib/ids";
import { addMinutes } from "@/lib/time";
import { getRates } from "./queries/reference";
import { isDoctorVisible } from "./doctors";
import { INDIA } from "./location";
import { cancelAppointmentReminders, notifyAppointment, notifyUser, scheduleAppointmentReminders } from "./notify";
import { acceptsDirectPayment } from "@/lib/direct-payment";
import { gatewayRefund, pickGateway, razorpayCreateOrder, stripeCreateCheckout } from "./payments/gateways";
import { audit } from "./audit";

export type RefundPolicy = { doctorNoShowMinutes: number; patientCancelFullRefundHours: number; patientCancelPartialRefundPercent: number; rescheduleFreeHours: number };

export async function getPolicy(db?: Executor): Promise<RefundPolicy> {
  const d = db ?? (await getDb());
  const [row] = await d.select().from(settings).where(eq(settings.key, "refund_policy"));
  return { doctorNoShowMinutes: 10, patientCancelFullRefundHours: 4, patientCancelPartialRefundPercent: 50, rescheduleFreeHours: 2, ...((row?.value as Partial<RefundPolicy>) ?? {}) };
}

export function policyText(p: RefundPolicy) {
  return {
    refund: `Full refund if the doctor does not join within ${p.doctorNoShowMinutes} minutes, or if you cancel ${p.patientCancelFullRefundHours}+ hours before. ${p.patientCancelPartialRefundPercent}% refund if you cancel later. No refund after the consult starts.`,
    reschedule: `You can change the time up to ${p.rescheduleFreeHours} hours before the start time.`,
  };
}

export class BookingError extends UserError {
  constructor(
    public code:
      | "not_allowed"
      | "doctor_unavailable"
      | "not_licensed"
      | "slot_taken"
      | "mode_unavailable"
      | "red_flags"
      | "consent_pending"
      | "not_found"
      | "bad_state",
    message: string,
  ) {
    super(message);
  }
}

/** Patients this user may book for: themself and family members with an active, consented link. */
export async function bookablePatients(db: Executor, userId: string) {
  const own = await db.select().from(patients).where(and(eq(patients.userId, userId), sql`${patients.deletedAt} is null`));
  const linked = await db
    .select({ p: patients, link: familyLinks })
    .from(familyLinks)
    .innerJoin(patients, eq(patients.id, familyLinks.patientId))
    .where(and(eq(familyLinks.caregiverUserId, userId), sql`${patients.deletedAt} is null`));
  return [
    ...own.map((p) => ({ patient: p, relationship: "self" as string, status: "active" as string, canBook: true })),
    ...linked.map(({ p, link }) => ({ patient: p, relationship: link.relationship, status: link.status, canBook: link.status === "active" && link.canBook })),
  ];
}

export async function canActForPatient(db: Executor, userId: string, patientId: string, need: "book" | "join" | "records" = "book") {
  const [self] = await db.select({ id: patients.id }).from(patients).where(and(eq(patients.id, patientId), eq(patients.userId, userId)));
  if (self) return { ok: true as const, role: "patient" as const };
  const [link] = await db.select().from(familyLinks).where(and(eq(familyLinks.patientId, patientId), eq(familyLinks.caregiverUserId, userId)));
  if (!link || link.status !== "active") return { ok: false as const, role: "caregiver" as const, pending: link?.status === "pending_consent" };
  const allowed = need === "book" ? link.canBook : need === "join" ? link.canJoin : link.canViewRecords;
  return { ok: allowed, role: "caregiver" as const, pending: false };
}

/** Release holds and expire unpaid drafts (also run by the scheduler). */
/** How long an unpaid booking keeps its slot. Draft expiry and slot holds use the same window. */
export const HOLD_MINUTES = 15;

export async function expireStaleDrafts(db: Executor, now = new Date()) {
  const stale = await db
    .update(appointments)
    .set({ status: "expired" })
    .where(
      and(
        eq(appointments.status, "pending_payment"),
        lt(appointments.createdAt, addMinutes(now, -HOLD_MINUTES)),
        // A direct payment the patient says they made waits for the doctor until the consult time.
        sql`not (${appointments.startAt} > ${now.toISOString()}::timestamptz and exists (select 1 from ${payments} p where p.appointment_id = ${appointments.id} and p.status = 'created' and p.submitted_at is not null))`,
      ),
    )
    .returning({ id: appointments.id });
  if (stale.length)
    await db
      .update(availabilitySlots)
      .set({ status: "open", heldUntil: null, appointmentId: null })
      .where(and(inArray(availabilitySlots.appointmentId, stale.map((s) => s.id)), eq(availabilitySlots.status, "held")));
  return stale.length;
}

export type DraftInput = {
  userId: string;
  doctorId: string;
  mode: "video" | "audio" | "chat" | "in_clinic";
  slotId: string | null; // null = instant consult starting now
  patientId: string;
  currency: Currency;
  patientTimeZone: string;
  consultType?: "first" | "follow_up";
  interpreterLanguage?: string | null;
  redFlags: string[];
  parentAppointmentId?: string | null;
  actionId?: string | null;
  caregiverConfirmedConsent?: boolean;
  bookedByRole?: string;
};

export async function createDraftAppointment(input: DraftInput) {
  if (input.redFlags.length) throw new BookingError("red_flags", "Red-flag symptoms: emergency care needed");
  const db = await getDb();
  await expireStaleDrafts(db);

  const access = await canActForPatient(db, input.userId, input.patientId, "book");
  const staffBooking = input.bookedByRole === "care_coordinator";
  if (!access.ok && !staffBooking) throw new BookingError(access.pending ? "consent_pending" : "not_allowed", "You can't book for this person yet");
  const [doctor] = await db.select().from(doctors).where(eq(doctors.id, input.doctorId));
  if (!doctor) throw new BookingError("not_found", "Doctor not found");
  if (!doctor.modes.includes(input.mode)) throw new BookingError("mode_unavailable", "This doctor doesn't offer that consult mode");

  // Every consult is with a doctor registered in India, under India's
  // telemedicine rules, wherever the patient lives.
  if (!(await isDoctorVisible(db, doctor.id))) {
    throw new BookingError("not_licensed", "This doctor is not taking bookings at the moment");
  }
  const [patient] = await db.select().from(patients).where(eq(patients.id, input.patientId));
  if (!patient) throw new BookingError("not_found", "Patient not found");

  // Consult type: follow-up when the same doctor saw this patient recently.
  let consultType = input.consultType ?? "first";
  if (!input.consultType) {
    const [recent] = await db
      .select({ id: appointments.id })
      .from(appointments)
      .where(
        and(
          eq(appointments.doctorId, doctor.id),
          eq(appointments.patientId, patient.id),
          eq(appointments.status, "completed"),
          gt(appointments.startAt, new Date(Date.now() - 30 * 86400_000)),
        ),
      )
      .limit(1);
    if (recent || input.parentAppointmentId) consultType = "follow_up";
  }

  let startAt: Date;
  let endAt: Date;
  let clinicId: string | null = null;
  const kind = input.slotId ? "scheduled" : "instant";
  if (input.slotId) {
    const group = input.mode === "in_clinic" ? "in_clinic" : "online";
    const [slot] = await db
      .update(availabilitySlots)
      .set({ status: "held", heldUntil: addMinutes(new Date(), HOLD_MINUTES) })
      .where(
        and(
          eq(availabilitySlots.id, input.slotId),
          eq(availabilitySlots.doctorId, doctor.id),
          eq(availabilitySlots.group, group),
          gt(availabilitySlots.startAt, new Date()),
          sql`(${availabilitySlots.status} = 'open' or (${availabilitySlots.status} = 'held' and ${availabilitySlots.heldUntil} < now()))`,
        ),
      )
      .returning();
    if (!slot) throw new BookingError("slot_taken", "Sorry, someone just booked that time. Please pick another slot.");
    if (slot.appointmentId) {
      await db.update(appointments).set({ status: "expired" }).where(and(eq(appointments.id, slot.appointmentId), eq(appointments.status, "pending_payment")));
    }
    startAt = slot.startAt;
    endAt = slot.endAt;
    clinicId = slot.clinicId;
  } else {
    if (input.mode === "in_clinic") throw new BookingError("bad_state", "Clinic visits need a time slot");
    if (!doctor.acceptsInstant) throw new BookingError("doctor_unavailable", "This doctor doesn't take instant consults");
    startAt = new Date();
    endAt = addMinutes(startAt, doctor.consultMinutes);
  }

  // Price in the patient's currency.
  const rates = await getRates();
  const rate = rates[input.currency]?.rate ?? 1;
  const fees = await db.select().from(doctorFees).where(eq(doctorFees.doctorId, doctor.id));
  let fee = feeFor(fees, input.mode, input.currency, rate)?.amountMinor ?? 0;
  if (input.mode === "in_clinic" && clinicId) {
    const [link] = await db.select().from(doctorClinicLinks).where(and(eq(doctorClinicLinks.doctorId, doctor.id), eq(doctorClinicLinks.clinicId, clinicId)));
    if (link?.inClinicFeeMinor) fee = feeFor([{ mode: "in_clinic", currency: "INR", amountMinor: link.inClinicFeeMinor }], "in_clinic", input.currency, rate)?.amountMinor ?? fee;
  }

  // Online → clinic: the online fee can be credited against the clinic visit.
  let credit = 0;
  let parent: typeof appointments.$inferSelect | undefined;
  if (input.parentAppointmentId) {
    [parent] = await db.select().from(appointments).where(eq(appointments.id, input.parentAppointmentId));
    if (parent && parent.patientId === patient.id && doctor.creditOnlineFeeToClinic && parent.doctorId === doctor.id && input.mode === "in_clinic" && parent.status === "completed") {
      const parentFeeInInr = parent.currency === "INR" ? parent.feeMinor : Math.round(parent.feeMinor / (rates[parent.currency as Currency]?.rate ?? 1));
      credit = Math.min(fee, input.currency === "INR" ? parentFeeInInr : Math.round(parentFeeInInr * rate));
    }
  }

  // Care plan coverage.
  let subscriptionId: string | null = null;
  if (input.mode !== "in_clinic") {
    const [sub] = await db
      .select({ s: subscriptions, plan: plans })
      .from(subscriptions)
      .innerJoin(plans, eq(plans.id, subscriptions.planId))
      .where(
        and(
          eq(subscriptions.status, "active"),
          gt(subscriptions.periodEnd, new Date()),
          sql`${patient.id} = any(${subscriptions.patientIds})`,
          sql`${subscriptions.consultsUsed} < ${plans.consultsPerMonth}`,
        ),
      )
      .limit(1);
    if (sub) subscriptionId = sub.s.id;
  }

  // Paid straight to the doctor: the patient pays the doctor's fee only.
  const direct = acceptsDirectPayment(doctor.paymentDetails);
  const quote = buildQuote({
    feeMinor: fee,
    currency: input.currency,
    rate,
    platformFeeInrMinor: direct ? 0 : env.platformFeeInrMinor,
    gstRate: direct ? 0 : env.gstRate,
    creditMinor: credit,
    covered: Boolean(subscriptionId),
    platformState: env.platformState,
  });
  const policy = await getPolicy(db);
  const journeyId = parent?.journeyId ?? (await db.insert(careJourneys).values({ patientId: patient.id, title: doctor.fullName }).returning())[0]!.id;

  const [appt] = await db
    .insert(appointments)
    .values({
      ref: refs.appointment(),
      patientId: patient.id,
      bookedByUserId: input.userId,
      bookedByRole: input.bookedByRole ?? access.role,
      doctorId: doctor.id,
      clinicId,
      slotId: input.slotId,
      journeyId,
      parentAppointmentId: parent?.id ?? null,
      mode: input.mode,
      kind,
      consultType,
      status: "pending_payment",
      startAt,
      endAt,
      doctorTimeZone: doctor.timeZone,
      patientTimeZone: input.patientTimeZone,
      // Consult jurisdiction (always India), not where the patient lives.
      patientLocationCountry: INDIA.country,
      patientLocationRegion: null,
      locationConfirmedAt: new Date(),
      locationSource: null,
      interpreterLanguage: input.interpreterLanguage || null,
      currency: input.currency,
      feeMinor: quote.feeMinor,
      platformFeeMinor: quote.platformFeeMinor,
      taxMinor: quote.taxMinor,
      discountMinor: 0,
      creditMinor: quote.creditMinor,
      totalMinor: quote.totalMinor,
      paymentMode: subscriptionId ? "plan" : "online",
      subscriptionId,
      policySnapshot: { ...policyText(policy), consultMinutes: doctor.consultMinutes },
      explicitConsentAt: access.role === "caregiver" && input.caregiverConfirmedConsent ? new Date() : null,
    })
    .returning();
  if (input.slotId) await db.update(availabilitySlots).set({ appointmentId: appt!.id }).where(eq(availabilitySlots.id, input.slotId));
  if (access.role === "caregiver" && input.caregiverConfirmedConsent) {
    await db.insert(consentsTable).values({
      userId: input.userId,
      patientId: patient.id,
      appointmentId: appt!.id,
      type: "telemedicine",
      version: "1.0",
      granted: true,
      method: "explicit_verbal",
      recordedByUserId: input.userId,
    });
  }
  if (input.actionId) await db.update(consultActions).set({ bookedAppointmentId: appt!.id }).where(eq(consultActions.id, input.actionId));
  return appt!;
}

export async function quoteForAppointment(appt: typeof appointments.$inferSelect, coupon?: typeof coupons.$inferSelect | null) {
  const rates = await getRates();
  const cur = (isCurrency(appt.currency) ? appt.currency : "INR") as Currency;
  const [doctor] = await (await getDb()).select({ paymentDetails: doctors.paymentDetails }).from(doctors).where(eq(doctors.id, appt.doctorId));
  const direct = acceptsDirectPayment(doctor?.paymentDetails);
  return buildQuote({
    feeMinor: appt.feeMinor,
    currency: cur,
    rate: rates[cur]?.rate ?? 1,
    platformFeeInrMinor: direct ? 0 : env.platformFeeInrMinor,
    gstRate: direct ? 0 : env.gstRate,
    creditMinor: appt.creditMinor,
    covered: appt.paymentMode === "plan",
    coupon: coupon ? { code: coupon.code, kind: coupon.kind, value: coupon.value, maxDiscountMinor: coupon.maxDiscountMinor } : null,
    platformState: env.platformState,
  });
}

export async function applyCoupon(apptId: string, userId: string, code: string) {
  const db = await getDb();
  const [appt] = await db.select().from(appointments).where(and(eq(appointments.id, apptId), eq(appointments.bookedByUserId, userId)));
  if (!appt || appt.status !== "pending_payment") return { ok: false as const, error: "This booking can't be changed now." };
  const [coupon] = await db.select().from(coupons).where(sql`upper(${coupons.code}) = ${code.trim().toUpperCase()}`);
  const now = new Date();
  if (!coupon || !coupon.active || (coupon.validFrom && coupon.validFrom > now) || (coupon.validUntil && coupon.validUntil < now) || (coupon.maxUses && coupon.usedCount >= coupon.maxUses)) {
    return { ok: false as const, error: "This code isn't valid." };
  }
  if (coupon.firstConsultOnly) {
    const [prior] = await db.select({ id: appointments.id }).from(appointments).where(and(eq(appointments.bookedByUserId, userId), inArray(appointments.status, ["completed", "confirmed"]))).limit(1);
    if (prior) return { ok: false as const, error: "This code is for your first consult only." };
  }
  const q = await quoteForAppointment(appt, coupon);
  await db.update(appointments).set({ couponId: coupon.id, discountMinor: q.discountMinor, totalMinor: q.totalMinor }).where(eq(appointments.id, appt.id));
  return { ok: true as const, discountMinor: q.discountMinor };
}

export async function removeCoupon(apptId: string, userId: string) {
  const db = await getDb();
  const [appt] = await db.select().from(appointments).where(and(eq(appointments.id, apptId), eq(appointments.bookedByUserId, userId)));
  if (!appt || appt.status !== "pending_payment") return;
  const q = await quoteForAppointment(appt, null);
  await db.update(appointments).set({ couponId: null, discountMinor: 0, totalMinor: q.totalMinor }).where(eq(appointments.id, appt.id));
}

export async function nextInvoiceNumber(db: Executor, at = new Date()) {
  const fy = financialYear(at);
  const key = `invoice_counter_${fy}`;
  const [row] = await db
    .insert(settings)
    .values({ key, value: { n: 1 } })
    .onConflictDoUpdate({ target: settings.key, set: { value: sql`jsonb_build_object('n', (${settings.value}->>'n')::int + 1)` } })
    .returning();
  const n = (row!.value as { n: number }).n;
  return `INV/${fy}/${String(n).padStart(6, "0")}`;
}

/** Start payment: returns where to send the patient next. */
export async function startAppointmentPayment(apptId: string, userId: string, method?: string) {
  const db = await getDb();
  const [appt] = await db.select().from(appointments).where(and(eq(appointments.id, apptId), eq(appointments.bookedByUserId, userId)));
  if (!appt) throw new BookingError("not_found", "Booking not found");
  if (appt.status !== "pending_payment") throw new BookingError("bad_state", "This booking is no longer waiting for payment");
  // Keep the slot held while paying.
  if (appt.slotId) await db.update(availabilitySlots).set({ status: "held", heldUntil: addMinutes(new Date(), HOLD_MINUTES) }).where(eq(availabilitySlots.id, appt.slotId));
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  const [patient] = await db.select().from(patients).where(eq(patients.id, appt.patientId));
  const [doctor] = await db.select().from(doctors).where(eq(doctors.id, appt.doctorId));
  const rates = await getRates();
  const gateway = appt.totalMinor === 0 ? "demo" : acceptsDirectPayment(doctor?.paymentDetails) ? "direct" : pickGateway(appt.currency);
  if (gateway === "demo" && appt.totalMinor > 0 && !env.demoMode) {
    throw new BookingError("bad_state", "Online payments are not set up yet. Please contact support.");
  }
  const [payment] = await db
    .insert(payments)
    .values({
      userId,
      patientId: appt.patientId,
      appointmentId: appt.id,
      purpose: appt.mode === "in_clinic" ? "clinic_visit" : "consult",
      gateway,
      method: method ?? null,
      currency: appt.currency,
      amountMinor: appt.totalMinor,
      feeMinor: appt.feeMinor - appt.creditMinor - appt.discountMinor,
      platformFeeMinor: appt.platformFeeMinor,
      taxMinor: appt.taxMinor,
      discountMinor: appt.discountMinor,
      taxLines: (await quoteForAppointment(appt)).taxLines,
      fxRate: rates[appt.currency as Currency]?.rate ?? 1,
      fxAsOf: rates[appt.currency as Currency]?.asOf ?? null,
      billing: { name: user?.name ?? patient?.fullName ?? "", email: user?.email ?? undefined, phone: user?.phone ?? undefined, country: user?.countryCode ?? "IN" },
    })
    .returning();
  if (appt.totalMinor === 0) {
    await capturePayment(payment!.id, { gatewayPaymentId: `free_${payment!.id.slice(0, 8)}`, method: appt.paymentMode === "plan" ? "plan" : "free" });
    return { kind: "done" as const, appointmentId: appt.id };
  }
  // The patient pays the doctor by UPI or bank transfer, then tells us the reference.
  if (gateway === "direct") return { kind: "redirect" as const, url: `/pay/direct/${payment!.id}` };
  const description = `${brand.name}: ${appt.mode === "in_clinic" ? "Clinic visit" : "Consult"} with ${doctor?.fullName} (${appt.ref})`;
  if (gateway === "razorpay") {
    const order = await razorpayCreateOrder({ amountMinor: appt.totalMinor, currency: appt.currency, receipt: appt.ref, notes: { payment_id: payment!.id, appointment: appt.ref } });
    await db.update(payments).set({ gatewayOrderId: order.id }).where(eq(payments.id, payment!.id));
    return {
      kind: "razorpay" as const,
      paymentId: payment!.id,
      options: { key: process.env.RAZORPAY_KEY_ID!, order_id: order.id, amount: appt.totalMinor, currency: appt.currency, name: brand.name, description, prefill: { name: user?.name, email: user?.email, contact: user?.phone } },
    };
  }
  if (gateway === "stripe") {
    const session = await stripeCreateCheckout({
      paymentId: payment!.id,
      amountMinor: appt.totalMinor,
      currency: appt.currency,
      description,
      email: user?.email,
      successPath: `/book/done/${appt.id}?paid=1`,
      cancelPath: `/book/review/${appt.id}?cancelled=1`,
    });
    await db.update(payments).set({ gatewayOrderId: session.id }).where(eq(payments.id, payment!.id));
    return { kind: "redirect" as const, url: session.url };
  }
  return { kind: "redirect" as const, url: `/pay/${payment!.id}` };
}

/**
 * Payment succeeded (from the gateway callback, webhook, or the demo page).
 * Idempotent. The money is held: the doctor's share is released only after
 * the consult is completed, and it is refunded if the doctor doesn't join.
 */
export async function capturePayment(paymentId: string, info: { gatewayPaymentId: string; method?: string | null }) {
  const db = await getDb();
  const [payment] = await db.select().from(payments).where(eq(payments.id, paymentId));
  if (!payment) throw new BookingError("not_found", "Payment not found");
  if (payment.status === "captured") return payment;
  // Paid straight to the doctor: the platform received nothing, so it issues no invoice of its own.
  const invoiceNumber = payment.gateway === "direct" ? null : await nextInvoiceNumber(db);
  const [updated] = await db
    .update(payments)
    .set({ status: "captured", gatewayPaymentId: info.gatewayPaymentId, method: info.method ?? payment.method, capturedAt: new Date(), invoiceNumber, invoiceIssuedAt: invoiceNumber ? new Date() : null, payoutState: payment.gateway === "direct" ? "paid_out" : "held" })
    .where(and(eq(payments.id, paymentId), eq(payments.status, "created")))
    .returning();
  if (!updated) return payment;
  if (payment.appointmentId) await confirmAppointment(db, payment.appointmentId);
  return updated;
}

export async function confirmAppointment(db: Executor, appointmentId: string) {
  const [appt] = await db
    .update(appointments)
    .set({ status: "confirmed" })
    .where(and(eq(appointments.id, appointmentId), eq(appointments.status, "pending_payment")))
    .returning();
  if (!appt) return null;
  if (appt.slotId) await db.update(availabilitySlots).set({ status: "booked", heldUntil: null, appointmentId: appt.id }).where(eq(availabilitySlots.id, appt.slotId));
  if (appt.couponId) await db.update(coupons).set({ usedCount: sql`${coupons.usedCount} + 1` }).where(eq(coupons.id, appt.couponId));
  if (appt.subscriptionId) await db.update(subscriptions).set({ consultsUsed: sql`${subscriptions.consultsUsed} + 1` }).where(eq(subscriptions.id, appt.subscriptionId));
  if (appt.mode === "in_clinic") {
    const { shortCode } = await import("@/lib/crypto");
    await db.update(appointments).set({ visitPassCode: shortCode(6) }).where(eq(appointments.id, appt.id));
    if (appt.parentAppointmentId)
      await db
        .update(consultActions)
        .set({ status: "booked", bookedAppointmentId: appt.id })
        .where(and(eq(consultActions.appointmentId, appt.parentAppointmentId), eq(consultActions.type, "in_person_visit")));
  }
  // TPG: consent is implied when the patient starts the consult themselves.
  if (appt.bookedByRole === "patient") {
    await db.insert(consentsTable).values({ userId: appt.bookedByUserId, patientId: appt.patientId, appointmentId: appt.id, type: "telemedicine", version: "1.0", granted: true, method: "implied" });
  }
  const [doc] = await db.select({ name: doctors.fullName }).from(doctors).where(eq(doctors.id, appt.doctorId));
  await notifyAppointment(db, appt.id, ({ t, intl, tz }) => ({
    template: "appointment_confirmed",
    title: appt.mode === "in_clinic" ? t("Clinic visit booked") : t("Consult booked"),
    body: t("{doctor} on {when}. Booking ref {ref}.", {
      doctor: doc?.name ?? "",
      when: new Intl.DateTimeFormat(intl, { timeZone: tz, dateStyle: "medium", timeStyle: "short" }).format(appt.startAt),
      ref: appt.ref,
    }),
    link: `/consults/${appt.id}`,
  }));
  await scheduleAppointmentReminders(db, appt.id);
  return appt;
}

export async function failPayment(paymentId: string, reason: string) {
  const db = await getDb();
  await db.update(payments).set({ status: "failed", failureReason: reason.slice(0, 300) }).where(and(eq(payments.id, paymentId), eq(payments.status, "created")));
}

/** Refund part or all of a payment (gateway + ledger). */
export async function refundPayment(paymentId: string, amountMinor: number, reason: string, initiatedBy: "system" | "admin" | "patient" | "doctor", initiatedByUserId?: string | null) {
  const db = await getDb();
  const [p] = await db.select().from(payments).where(eq(payments.id, paymentId));
  if (!p || (p.status !== "captured" && p.status !== "partially_refunded")) return null;
  const amount = Math.min(amountMinor, p.amountMinor - p.refundedMinor);
  if (amount <= 0) return null;
  let gatewayRefundId: string | null = null;
  let status = "processed";
  if (p.gateway === "direct") {
    // Paid straight to the doctor, so the doctor sends the money back and marks it done.
    status = "pending";
  } else {
    try {
      gatewayRefundId = await gatewayRefund(p.gateway, p.gatewayPaymentId, amount, { reason: reason.slice(0, 100) });
    } catch (e) {
      status = "failed";
      console.error("[refund]", e);
    }
  }
  const [r] = await db.insert(refunds).values({ paymentId: p.id, amountMinor: amount, currency: p.currency, reason, initiatedBy, initiatedByUserId: initiatedByUserId ?? null, status, gatewayRefundId }).returning();
  if (status === "processed") {
    const refunded = p.refundedMinor + amount;
    await db
      .update(payments)
      .set({ refundedMinor: refunded, status: refunded >= p.amountMinor ? "refunded" : "partially_refunded", payoutState: refunded >= p.amountMinor ? "refunded" : p.payoutState })
      .where(eq(payments.id, p.id));
  }
  await audit({ actor: initiatedByUserId ? { id: initiatedByUserId, role: initiatedBy } : null, action: "payment.refund", entityType: "payment", entityId: p.id, patientId: p.patientId, metadata: { amount, reason, status } }, db);
  if (status === "pending" && p.appointmentId) {
    const [row] = await db.select({ userId: doctors.userId }).from(appointments).innerJoin(doctors, eq(doctors.id, appointments.doctorId)).where(eq(appointments.id, p.appointmentId));
    if (row?.userId)
      await notifyUser(db, row.userId, {
        template: "direct_refund_due",
        title: "Refund to send",
        body: `Please send ${formatMoney(amount, p.currency, "en-IN")} back to the patient and mark it as sent.`,
        link: "/doctor/payments",
      });
  }
  return r!;
}

export function cancellationRefund(appt: { startAt: Date; totalMinor: number }, policy: RefundPolicy, by: "patient" | "doctor" | "system" | "admin", now = new Date()) {
  if (by !== "patient") return appt.totalMinor;
  const hours = (appt.startAt.getTime() - now.getTime()) / 3600_000;
  if (hours >= policy.patientCancelFullRefundHours) return appt.totalMinor;
  if (hours > 0) return Math.floor((appt.totalMinor * policy.patientCancelPartialRefundPercent) / 100);
  return 0;
}

export async function cancelAppointment(apptId: string, by: { userId: string | null; role: "patient" | "doctor" | "system" | "admin" }, reason: string) {
  const db = await getDb();
  const [appt] = await db.select().from(appointments).where(eq(appointments.id, apptId));
  if (!appt) throw new BookingError("not_found", "Not found");
  if (!["pending_payment", "confirmed"].includes(appt.status)) throw new BookingError("bad_state", "This booking can't be cancelled now");
  const policy = await getPolicy(db);
  await db.update(appointments).set({ status: "cancelled", cancelledAt: new Date(), cancelledBy: by.role, cancelReason: reason }).where(eq(appointments.id, appt.id));
  if (appt.slotId) await db.update(availabilitySlots).set({ status: "open", heldUntil: null, appointmentId: null }).where(eq(availabilitySlots.id, appt.slotId));
  await cancelAppointmentReminders(db, appt.id);
  const [pay] = await db.select().from(payments).where(and(eq(payments.appointmentId, appt.id), eq(payments.status, "captured")));
  let refunded = 0;
  if (pay) {
    const amount = cancellationRefund({ startAt: appt.startAt, totalMinor: pay.amountMinor }, policy, by.role);
    if (amount > 0) {
      await refundPayment(pay.id, amount, `Cancelled by ${by.role}: ${reason}`, by.role === "admin" ? "admin" : by.role === "doctor" ? "doctor" : by.role === "system" ? "system" : "patient", by.userId);
      refunded = amount;
    }
    if (amount < pay.amountMinor) await db.update(payments).set({ payoutState: "released" }).where(eq(payments.id, pay.id));
    if (appt.subscriptionId) await db.update(subscriptions).set({ consultsUsed: sql`greatest(${subscriptions.consultsUsed} - 1, 0)` }).where(eq(subscriptions.id, appt.subscriptionId));
  }
  if (appt.status === "confirmed") {
    await notifyAppointment(db, appt.id, ({ t, intl }) => ({
      template: "appointment_cancelled",
      title: t("Booking cancelled"),
      body: refunded ? t("Booking {ref} was cancelled. A refund of {amount} is on its way and reaches you in 5 to 7 working days.", { ref: appt.ref, amount: formatMoney(refunded, appt.currency, intl) }) : t("Booking {ref} was cancelled.", { ref: appt.ref }),
      link: `/consults/${appt.id}`,
    }));
  }
  await audit({ actor: by.userId ? { id: by.userId, role: by.role } : null, action: "appointment.cancel", entityType: "appointment", entityId: appt.id, patientId: appt.patientId, metadata: { reason, refunded } }, db);
  return { refunded, currency: appt.currency };
}

export async function rescheduleAppointment(apptId: string, userId: string, newSlotId: string) {
  const db = await getDb();
  const [appt] = await db.select().from(appointments).where(and(eq(appointments.id, apptId), eq(appointments.bookedByUserId, userId)));
  if (!appt || appt.status !== "confirmed") throw new BookingError("bad_state", "This booking can't be rescheduled");
  const policy = await getPolicy(db);
  if (appt.startAt.getTime() - Date.now() < policy.rescheduleFreeHours * 3600_000) throw new BookingError("bad_state", `Reschedule is possible up to ${policy.rescheduleFreeHours} hours before the start`);
  const group = appt.mode === "in_clinic" ? "in_clinic" : "online";
  const [slot] = await db
    .update(availabilitySlots)
    .set({ status: "booked", heldUntil: null, appointmentId: appt.id })
    .where(
      and(
        eq(availabilitySlots.id, newSlotId),
        eq(availabilitySlots.doctorId, appt.doctorId),
        eq(availabilitySlots.group, group),
        gt(availabilitySlots.startAt, new Date()),
        sql`(${availabilitySlots.status} = 'open' or (${availabilitySlots.status} = 'held' and ${availabilitySlots.heldUntil} < now()))`,
      ),
    )
    .returning();
  if (!slot) throw new BookingError("slot_taken", "That time is no longer free");
  if (appt.slotId) await db.update(availabilitySlots).set({ status: "open", appointmentId: null }).where(eq(availabilitySlots.id, appt.slotId));
  await db.update(appointments).set({ startAt: slot.startAt, endAt: slot.endAt, slotId: slot.id, clinicId: slot.clinicId ?? appt.clinicId }).where(eq(appointments.id, appt.id));
  await cancelAppointmentReminders(db, appt.id);
  await scheduleAppointmentReminders(db, appt.id);
  await audit({ actor: { id: userId, role: "patient" }, action: "appointment.reschedule", entityType: "appointment", entityId: appt.id, patientId: appt.patientId }, db);
  return slot;
}

/**
 * Refund in full, automatically, when the doctor hasn't joined within the
 * no-show window. Runs every minute from the scheduler.
 */
export async function handleDoctorNoShows(now = new Date()) {
  const db = await getDb();
  const policy = await getPolicy(db);
  const cutoff = addMinutes(now, -policy.doctorNoShowMinutes);
  const due = await db
    .select()
    .from(appointments)
    .where(and(eq(appointments.status, "confirmed"), sql`${appointments.mode} <> 'in_clinic'`, lt(appointments.startAt, cutoff), sql`${appointments.doctorJoinedAt} is null`));
  for (const appt of due) {
    const [updated] = await db
      .update(appointments)
      .set({ status: "doctor_no_show", endedAt: now, outcome: "doctor_no_show" })
      .where(and(eq(appointments.id, appt.id), eq(appointments.status, "confirmed")))
      .returning();
    if (!updated) continue;
    const [pay] = await db.select().from(payments).where(and(eq(payments.appointmentId, appt.id), eq(payments.status, "captured")));
    if (pay) await refundPayment(pay.id, pay.amountMinor, `Doctor did not join within ${policy.doctorNoShowMinutes} minutes`, "system");
    if (appt.subscriptionId) await db.update(subscriptions).set({ consultsUsed: sql`greatest(${subscriptions.consultsUsed} - 1, 0)` }).where(eq(subscriptions.id, appt.subscriptionId));
    await cancelAppointmentReminders(db, appt.id);
    await notifyAppointment(db, appt.id, ({ t }) => ({
      template: "doctor_no_show",
      title: t("Sorry, the doctor couldn't join"),
      body: t("We've refunded your payment in full. You can see another doctor now.", {}),
      link: "/doctors",
    }));
  }
  return due.length;
}

/** Latest captured payment for an appointment (for invoices and receipts). */
export async function paymentForAppointment(db: Executor, appointmentId: string) {
  const [p] = await db.select().from(payments).where(eq(payments.appointmentId, appointmentId)).orderBy(desc(payments.createdAt)).limit(1);
  return p ?? null;
}

/* --------------------------------------------------------- direct payments */

/** The patient says they paid the doctor directly: record the reference and keep the time held for them. */
export async function submitDirectPayment(paymentId: string, userId: string, input: { reference: string; method: "upi" | "bank" | "other"; proofDocumentId: string | null }) {
  const db = await getDb();
  const [p] = await db.select().from(payments).where(and(eq(payments.id, paymentId), eq(payments.userId, userId)));
  if (!p || p.gateway !== "direct" || p.status !== "created") throw new BookingError("bad_state", "This payment can't be changed now.");
  const [appt] = await db.select().from(appointments).where(eq(appointments.id, p.appointmentId!));
  if (!appt || appt.status !== "pending_payment") throw new BookingError("bad_state", "This booking is no longer waiting for payment");
  await db
    .update(payments)
    .set({ gatewayPaymentId: input.reference, method: input.method, proofDocumentId: input.proofDocumentId, submittedAt: new Date() })
    .where(eq(payments.id, p.id));
  if (appt.slotId) await db.update(availabilitySlots).set({ status: "held", heldUntil: appt.startAt, appointmentId: appt.id }).where(eq(availabilitySlots.id, appt.slotId));
  const [doctor] = await db.select({ userId: doctors.userId }).from(doctors).where(eq(doctors.id, appt.doctorId));
  if (doctor?.userId)
    await notifyUser(db, doctor.userId, {
      template: "direct_payment_submitted",
      title: "Payment to confirm",
      body: `A patient paid ${formatMoney(p.amountMinor, p.currency, "en-IN")} for booking ${appt.ref}. Please check your account and confirm.`,
      link: "/doctor/payments",
    });
  await audit({ actor: { id: userId, role: "patient" }, action: "payment.direct_submitted", entityType: "payment", entityId: p.id, patientId: p.patientId, metadata: { method: input.method } }, db);
  return appt;
}

async function directPaymentForDoctor(doctorUserId: string, paymentId: string) {
  const db = await getDb();
  const [row] = await db
    .select({ p: payments, appt: appointments })
    .from(payments)
    .innerJoin(appointments, eq(appointments.id, payments.appointmentId))
    .innerJoin(doctors, eq(doctors.id, appointments.doctorId))
    .where(and(eq(payments.id, paymentId), eq(payments.gateway, "direct"), eq(doctors.userId, doctorUserId)));
  if (!row) throw new BookingError("not_found", "Payment not found");
  return { db, ...row };
}

/** The doctor has received the money: the booking is confirmed. */
export async function confirmDirectPayment(doctorUserId: string, paymentId: string) {
  const { db, p } = await directPaymentForDoctor(doctorUserId, paymentId);
  if (p.status !== "created" || !p.submittedAt) throw new BookingError("bad_state", "This payment is not waiting for confirmation.");
  await capturePayment(p.id, { gatewayPaymentId: p.gatewayPaymentId ?? `direct_${p.id.slice(0, 8)}`, method: p.method });
  await audit({ actor: { id: doctorUserId, role: "doctor" }, action: "payment.direct_confirmed", entityType: "payment", entityId: p.id, patientId: p.patientId }, db);
}

/** The doctor did not receive the money: the booking is cancelled and the time is freed. */
export async function rejectDirectPayment(doctorUserId: string, paymentId: string, reason: string) {
  const { db, p, appt } = await directPaymentForDoctor(doctorUserId, paymentId);
  if (p.status !== "created") throw new BookingError("bad_state", "This payment is not waiting for confirmation.");
  await failPayment(p.id, reason || "Payment not received");
  await db.update(appointments).set({ status: "cancelled", cancelledAt: new Date(), cancelReason: reason || "Payment not received" }).where(and(eq(appointments.id, appt.id), eq(appointments.status, "pending_payment")));
  if (appt.slotId) await db.update(availabilitySlots).set({ status: "open", heldUntil: null, appointmentId: null }).where(eq(availabilitySlots.id, appt.slotId));
  await notifyUser(db, appt.bookedByUserId, {
    template: "direct_payment_rejected",
    title: "Payment not received",
    body: `The doctor could not find your payment for booking ${appt.ref}${reason ? `: ${reason}` : ""}. If you paid, reply to this message or contact us with your payment reference.`,
    link: `/consults/${appt.id}`,
  });
  await audit({ actor: { id: doctorUserId, role: "doctor" }, action: "payment.direct_rejected", entityType: "payment", entityId: p.id, patientId: p.patientId, metadata: { reason } }, db);
}

/** The doctor has sent a refund back to the patient. */
export async function markDirectRefundSent(doctorUserId: string, refundId: string) {
  const db = await getDb();
  const [row] = await db
    .select({ r: refunds, p: payments })
    .from(refunds)
    .innerJoin(payments, eq(payments.id, refunds.paymentId))
    .innerJoin(appointments, eq(appointments.id, payments.appointmentId))
    .innerJoin(doctors, eq(doctors.id, appointments.doctorId))
    .where(and(eq(refunds.id, refundId), eq(refunds.status, "pending"), eq(payments.gateway, "direct"), eq(doctors.userId, doctorUserId)));
  if (!row) throw new BookingError("not_found", "Refund not found");
  await db.update(refunds).set({ status: "processed" }).where(eq(refunds.id, refundId));
  const refunded = row.p.refundedMinor + row.r.amountMinor;
  await db
    .update(payments)
    .set({ refundedMinor: refunded, status: refunded >= row.p.amountMinor ? "refunded" : "partially_refunded", payoutState: refunded >= row.p.amountMinor ? "refunded" : row.p.payoutState })
    .where(eq(payments.id, row.p.id));
  await audit({ actor: { id: doctorUserId, role: "doctor" }, action: "payment.direct_refund_sent", entityType: "payment", entityId: row.p.id, patientId: row.p.patientId }, db);
}
