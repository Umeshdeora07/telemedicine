import { eq, sql } from "drizzle-orm";
import type { DB } from "@/db";
import { rows } from "@/db";
import * as s from "@/db/schema";
import { wipeAppTables } from "./ensure";
import { ensureReferenceData } from "./reference";

/**
 * Three test logins the site owner asked for while the live site is being
 * tried out: an admin, a patient and a doctor (in draft, so never shown to
 * patients). Only scrypt hashes are here; the owner was given the passwords
 * privately and can change them under Password. They come with no sample
 * doctors or bookings. On the Vercel production site only, unless
 * TEST_ACCOUNTS says otherwise (see env.testAccounts).
 */
export const TEST_ACCOUNTS = [
  { email: "admin@caremitra.test", name: "Test Admin", role: "super_admin", passwordHash: "scrypt$32768$8$1$IqcZbD//FmTlAQAae3hL8g==$1QGFOHoqedsg7SAM8ZSLr+9Km0OyRmYk/ZKC9ggX+Ro=" },
  { email: "doctor@caremitra.test", name: "Dr. Test Doctor", role: "doctor", passwordHash: "scrypt$32768$8$1$e6L1ZIY7wcc2/TWbiWyrvQ==$+0FGsBLZA3G7Z02THdrIZWHXYd9PPZgiz2qekTscz/o=" },
  { email: "patient@caremitra.test", name: "Test Patient", role: "patient", passwordHash: "scrypt$32768$8$1$QRIa2YdBb6C79cVxwApNKA==$V+gZWzrJZauj+7g7RK6gDtZd5a7qcrpMyrmt8oarPWs=" },
] as const;

/**
 * The owner asked to start the live site again from nothing on this date:
 * every earlier account and everything in it is removed once, then the test
 * logins are made. Never on a site that is already in real use (bookings or
 * payments, or many accounts): there the logins are only added.
 */
export const TEST_ACCOUNTS_RESET = "2026-10-19";
const MARKER = "setup:test_accounts";

export async function ensureTestAccounts(db: DB) {
  const [marker] = rows<{ value: string }>(await db.execute(sql`select value #>> '{}' as value from settings where key = ${MARKER}`));
  if (marker?.value === TEST_ACCOUNTS_RESET) return "done";
  const [use] = rows<{ users: number; bookings: number; paid: number }>(
    await db.execute(
      sql`select (select count(*)::int from users) as users, (select count(*)::int from appointments) as bookings, (select count(*)::int from payments where status = 'captured') as paid`,
    ),
  );
  const inUse = Number(use?.users ?? 0) > 25 || Number(use?.bookings ?? 0) > 0 || Number(use?.paid ?? 0) > 0;
  if (!inUse) {
    console.log("[db] Starting the site again from nothing, with three test logins (asked for by the owner).");
    await wipeAppTables(db);
    await ensureReferenceData(db);
  }
  for (const a of TEST_ACCOUNTS) {
    const [exists] = await db.select({ id: s.users.id }).from(s.users).where(sql`lower(${s.users.email}) = ${a.email}`);
    if (exists) continue;
    const [user] = await db
      .insert(s.users)
      .values({ role: a.role, name: a.name, email: a.email, passwordHash: a.passwordHash, onboarded: true, countryCode: "IN", timeZone: "Asia/Kolkata" })
      .returning();
    if (a.role === "doctor") {
      const [spec] = await db.select({ id: s.specialties.id }).from(s.specialties).where(eq(s.specialties.slug, "general-physician"));
      if (spec) {
        await db
          .insert(s.doctors)
          .values({ userId: user!.id, slug: `dr-test-doctor-${user!.id.slice(0, 6)}`, fullName: a.name, gender: "female", specialtyId: spec.id, verificationStatus: "draft" })
          .onConflictDoNothing();
      }
    }
    if (a.role === "patient") {
      await db.insert(s.patients).values({ userId: user!.id, ownerUserId: user!.id, fullName: a.name, dob: "1990-01-01", sex: "female", email: a.email, country: "IN", preferredLanguage: "en" });
    }
    if (a.role !== "super_admin") {
      await db
        .insert(s.consents)
        .values((["terms", "privacy", a.role === "doctor" ? "doctor_verification" : "telemedicine"] as const).map((type) => ({ userId: user!.id, type, granted: true, version: "1.0", method: "checkbox" })));
    }
  }
  await db.execute(sql`insert into settings (key, value) values (${MARKER}, to_jsonb(${TEST_ACCOUNTS_RESET}::text)) on conflict (key) do update set value = excluded.value, updated_at = now()`);
  console.log("[db] Test logins are ready.");
  return inUse ? "added" : "reset";
}
