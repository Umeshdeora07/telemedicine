import { afterAll, beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * The most important safety rule: patients only see doctors who are verified
 * and hold a valid Indian registration. Every consult is given under India's
 * telemedicine rules, wherever the patient lives, so the patient's location
 * never changes who is listed. Runs against a fresh embedded database with the
 * demo data.
 */
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cm-test-"));
process.env.PGLITE_DIR = path.join(dir, "pglite");
process.env.STORAGE_DIR = path.join(dir, "uploads");
process.env.DEMO_AUTO_SEED = "false";

type Doctors = typeof import("@/server/doctors");
type Db = typeof import("@/db");
type Schema = typeof import("@/db/schema");
let docs: Doctors;
let dbm: Db;
let schema: Schema;

beforeAll(async () => {
  dbm = await import("@/db");
  schema = await import("@/db/schema");
  const { ensureDemoData } = await import("@/db/seed/ensure");
  await ensureDemoData(await dbm.getDb());
  docs = await import("@/server/doctors");
});

afterAll(async () => {
  await dbm?.closeDb();
  fs.rmSync(dir, { recursive: true, force: true });
});

const HIDDEN = ["Dr. Vivek Malhotra", "Dr. Karan Sethi", "Dr. Neeraj Bansal", "Dr. Thomas George"];

describe("who patients can see", () => {
  it("lists three verified doctors in each of the four specialties", async () => {
    const list = await docs.listDoctors(null, { limit: 100 });
    const bySpecialty: Record<string, number> = {};
    for (const d of list) bySpecialty[d.specialtySlug] = (bySpecialty[d.specialtySlug] ?? 0) + 1;
    expect(bySpecialty).toEqual({ orthopaedics: 3, dermatology: 3, "general-physician": 3, psychology: 3 });
  });

  it("every listed doctor holds a verified, unexpired Indian registration", async () => {
    const { and, eq, inArray } = await import("drizzle-orm");
    const list = await docs.listDoctors(null, { limit: 100 });
    const db = await dbm.getDb();
    const lics = await db
      .select()
      .from(schema.doctorLicences)
      .where(and(inArray(schema.doctorLicences.doctorId, list.map((d) => d.id)), eq(schema.doctorLicences.country, "IN"), eq(schema.doctorLicences.status, "verified")));
    const today = new Date().toISOString().slice(0, 10);
    for (const d of list) {
      expect(lics.some((l) => l.doctorId === d.id && (!l.expiresAt || l.expiresAt >= today)), d.fullName).toBe(true);
    }
  });

  it("the patient's location never changes who is listed", async () => {
    const names = async (loc: { country: string; region: string | null } | null) => (await docs.listDoctors(loc, { limit: 100 })).map((d) => d.fullName).sort();
    const india = await names({ country: "IN", region: null });
    expect(await names({ country: "US", region: "US-NY" })).toEqual(india);
    expect(await names({ country: "BD", region: null })).toEqual(india);
    expect(await names(null)).toEqual(india);
  });

  it("pending, expired, suspended and foreign-only doctors never appear", async () => {
    const list = await docs.listDoctors(null, { limit: 100 });
    for (const name of HIDDEN) expect(list.some((d) => d.fullName === name), name).toBe(false);
    for (const slug of ["dr-vivek-malhotra", "dr-karan-sethi", "dr-neeraj-bansal", "dr-thomas-george"]) {
      expect(await docs.getDoctorProfile(slug), slug).toBeNull();
    }
  });

  it("a registration from another country alone never makes a doctor bookable", async () => {
    const { eq } = await import("drizzle-orm");
    const db = await dbm.getDb();
    const [thomas] = await db.select().from(schema.doctors).where(eq(schema.doctors.slug, "dr-thomas-george"));
    expect(thomas?.verificationStatus).toBe("approved");
    expect(await docs.isDoctorVisible(db, thomas!.id, { country: "GB", region: null })).toBe(false);
  });

  it("resolveLocation is always India", async () => {
    const { resolveLocation } = await import("@/server/location");
    expect(resolveLocation()).toEqual({ country: "IN", region: null });
  });
});

describe("demo data", () => {
  it("has the four specialties in order, each starting at its lowest online fee", async () => {
    const { asc } = await import("drizzle-orm");
    const db = await dbm.getDb();
    const specs = await db.select().from(schema.specialties).orderBy(asc(schema.specialties.sortOrder));
    expect(specs.map((s) => s.slug)).toEqual(["orthopaedics", "dermatology", "general-physician", "psychology"]);
    expect(specs.map((s) => s.name)).toEqual(["Orthopaedics", "Dermatology", "General Physician", "Psychology"]);
    for (const s of specs) {
      const list = await docs.listDoctors(null, { specialty: s.slug, limit: 100 });
      const lowest = Math.min(...list.flatMap((d) => d.fees.filter((f) => f.currency === "INR" && f.mode !== "in_clinic").map((f) => f.amountMinor)));
      expect(s.startingFeeMinor, s.slug).toBe(lowest);
    }
  });

  it("stores India as the jurisdiction of every consult", async () => {
    const { ne } = await import("drizzle-orm");
    const db = await dbm.getDb();
    expect(await db.select().from(schema.appointments).where(ne(schema.appointments.patientLocationCountry, "IN"))).toHaveLength(0);
  });

  it("psychologists never prescribe, and prescriptions carry an Indian registration", async () => {
    const { eq, inArray } = await import("drizzle-orm");
    const db = await dbm.getDb();
    const psychologists = await db.select().from(schema.doctors).where(inArray(schema.doctors.slug, ["ira-banerjee", "kunal-deshmukh"]));
    expect(psychologists).toHaveLength(2);
    expect(await db.select().from(schema.prescriptions).where(inArray(schema.prescriptions.doctorId, psychologists.map((p) => p.id)))).toHaveLength(0);
    const rxs = await db.select().from(schema.prescriptions);
    expect(rxs.length).toBeGreaterThan(0);
    for (const rx of rxs) {
      const snap = rx.snapshot as unknown as import("@/lib/rx").RxSnapshot;
      expect(snap.doctor.registrations.some((r) => r.country === "IN"), rx.number).toBe(true);
    }
    const [neha] = await db.select().from(schema.patients).where(eq(schema.patients.fullName, "Neha Gupta"));
    const visits = await db.select().from(schema.appointments).where(eq(schema.appointments.patientId, neha!.id));
    expect(visits.some((a) => a.mode === "in_clinic" && a.visitPassCode)).toBe(true);
  });

  it("only reloads a database it loaded itself, and reloads when the data version changes", async () => {
    const { sql } = await import("drizzle-orm");
    const { loadOrRefreshDemoData, demoMarker, DEMO_DATA_VERSION } = await import("@/db/seed/ensure");
    const db = await dbm.getDb();
    expect(demoMarker()).toMatch(new RegExp(`^\\d{4}-\\d{2}-\\d{2}#${DEMO_DATA_VERSION}$`));
    // Users but no marker: someone else's data, never touched.
    expect(await loadOrRefreshDemoData(db)).toBe("not a demo database");
    // A marker from before versions existed (today's date only): reload.
    const day = demoMarker().split("#")[0]!;
    await db.execute(sql`insert into settings (key, value) values ('demo:loaded_on', to_jsonb(${day}::text))`);
    expect(await loadOrRefreshDemoData(db)).toBe("reloaded");
    const [m] = dbm.rows<{ value: string }>(await db.execute(sql`select value #>> '{}' as value from settings where key = 'demo:loaded_on'`));
    expect(m?.value).toBe(demoMarker());
    expect(await loadOrRefreshDemoData(db)).toBe("current");
    expect((await docs.listDoctors(null, { limit: 100 })).length).toBe(12);
  });
});
