import { randomUUID } from "node:crypto";
import { expect, test, type Browser, type Locator, type Page } from "@playwright/test";
import { totpAt } from "../src/lib/totp";
import { demoLogin } from "./helpers";

/**
 * A new doctor signs up, fills every detail the verification team needs,
 * submits, and only appears on the public site after an admin approves them.
 */

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

// Smallest valid files that pass the upload type check (src/lib/storage.ts sniffMime).
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
const PDF = Buffer.from("%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n");
const png = (name: string) => ({ name: `${name}.png`, mimeType: "image/png", buffer: PNG });
const pdf = (name: string) => ({ name: `${name}.pdf`, mimeType: "application/pdf", buffer: PDF });

/** Upload a file through a FileUploader inside `scope` and wait until it is listed. */
async function upload(scope: Locator, index: number, file: { name: string; mimeType: string; buffer: Buffer }) {
  // Each uploader has a plain file input plus a camera one (with `capture`); use the plain one.
  await scope.locator('input[type="file"]:not([capture])').nth(index).setInputFiles(file);
  await expect(scope.getByRole("link", { name: new RegExp(file.name.replace(/\.\w+$/, "")) })).toBeVisible();
}

async function signedOutPage(browser: Browser) {
  const context = await browser.newContext({ baseURL: BASE_URL, locale: "en-IN", timezoneId: "Asia/Kolkata" });
  await context.addCookies([{ name: "cookie_choice", value: "essential", url: BASE_URL }]);
  return context.newPage();
}

async function dermatologyListing(page: Page) {
  await page.goto("/doctors?specialty=dermatology");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Dermatology/);
}

test("a new doctor signs up, gets verified by an admin and then appears on the site", async ({ page, browser }) => {
  test.setTimeout(300_000);
  const suffix = `${Date.now().toString(36)}${randomUUID().slice(0, 4)}`;
  const email = `new.doctor.${suffix}@example.com`;
  const name = `Meera Kapoor ${suffix}`;
  const doctorName = `Dr. ${name}`;
  const registration = `NMC-${suffix.toUpperCase()}`;

  // 1. Log in with a brand new email; demo mode shows the one time code on the page.
  await page.context().addCookies([{ name: "cookie_choice", value: "essential", url: BASE_URL }]);
  await page.goto("/login?next=/for-doctors/apply");
  await page.getByRole("tab", { name: "Email" }).click();
  await page.locator("#identifier").fill(email);
  await page.getByRole("button", { name: "Send code" }).click();
  const codeText = page.getByText(/here is your code:/);
  await expect(codeText).toBeVisible();
  const code = (await codeText.textContent())?.match(/\b(\d{6})\b/)?.[1];
  expect(code, "one time code shown on the page").toBeTruthy();
  await page.getByLabel("Code", { exact: true }).fill(code!);
  await page.getByRole("button", { name: "Verify and continue" }).click();
  await page.waitForURL((u) => u.pathname === "/onboarding" || u.pathname === "/for-doctors/apply");

  if (new URL(page.url()).pathname === "/onboarding") {
    await page.getByLabel("Your full name").fill(name);
    await page.getByLabel("Date of birth").fill("1985-04-12");
    await page.getByLabel("Sex", { exact: true }).selectOption("female");
    await page.getByLabel(/I agree to the/).check();
    await page.getByLabel(/online consultations have limits/).check();
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.waitForURL((u) => u.pathname === "/for-doctors/apply");
  }

  // 2. Apply as a dermatologist, then set up two step verification.
  await page.getByLabel("Full name as registered").fill(name);
  await page.getByLabel("Gender").selectOption("female");
  await page.getByLabel("Main specialty").selectOption("dermatology");
  await page.getByLabel(/I agree to verification of my registration/).check();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.waitForURL((u) => u.pathname === "/mfa");

  await page.getByRole("button", { name: "Set up two step verification" }).click();
  const secretEl = page.locator("code");
  await expect(secretEl).toHaveText(/^[A-Z2-7]{16,}$/);
  const secret = (await secretEl.textContent())!.trim();
  await page.getByLabel("Authenticator code").fill(totpAt(secret));
  await page.getByRole("button", { name: "Verify", exact: true }).click();
  await page.waitForURL((u) => u.pathname === "/doctor/onboarding");

  // 3. Fill every step of the checklist.
  const basics = page.locator('section[aria-labelledby="basics"]');
  await expect(basics.getByLabel("Main specialty")).toHaveValue("dermatology");
  await basics.getByLabel("Years of experience").fill("9");
  await basics.getByRole("button", { name: "Save basics" }).click();
  await expect(basics.getByText("Saved.")).toBeVisible();

  const quals = page.locator('section[aria-labelledby="quals"]');
  await quals.getByLabel("Degree", { exact: true }).fill("MD (Dermatology)");
  await quals.getByLabel("College or university").fill("Maulana Azad Medical College, Delhi");
  await quals.getByLabel("Year").fill("2012");
  await upload(quals, 0, pdf("degree-certificate"));
  await quals.getByRole("button", { name: "Add qualification" }).click();
  await expect(quals.locator("li strong", { hasText: "MD (Dermatology)" })).toBeVisible();

  const lic = page.locator('section[aria-labelledby="lic"]');
  await lic.getByLabel("Council you are registered with").selectOption("National Medical Commission");
  await lic.getByLabel("Registration number").fill(registration);
  await upload(lic, 0, pdf("registration-certificate"));
  await lic.getByRole("button", { name: "Add registration" }).click();
  await expect(lic.getByText("Registration added. Our team will check it with the council.")).toBeVisible();
  await expect(lic.getByRole("listitem").filter({ hasText: registration })).toBeVisible();

  const identity = page.locator('section[aria-labelledby="id"]');
  await upload(identity, 0, png("government-id"));
  await upload(identity, 1, png("selfie"));

  await page.goto("/doctor/profile");
  const profile = page.locator("form").filter({ has: page.getByRole("button", { name: "Save profile" }) });
  await upload(profile, 0, png("profile-photo"));
  await profile.getByLabel("Headline").fill("Skin, hair and nail care in plain words");
  await profile
    .getByLabel(/About you/)
    .fill("I am a dermatologist with nine years of experience treating acne, eczema, psoriasis, hair fall and skin allergies in adults and children.");
  await profile.getByRole("checkbox", { name: "English" }).check();
  await profile.getByRole("checkbox", { name: "Hindi" }).check();
  await upload(profile, 1, png("signature"));
  await profile.getByRole("button", { name: "Save profile" }).click();
  await expect(profile.getByText("Profile saved.")).toBeVisible();

  const fees = page.locator("form").filter({ has: page.getByRole("button", { name: "Save fees" }) });
  await fees.getByLabel("Video INR").fill("600");
  await fees.getByRole("button", { name: "Save fees" }).click();
  await expect(fees.getByText("Fees saved.")).toBeVisible();

  const treatmentFees = page.locator("form").filter({ has: page.getByRole("button", { name: "Save treatment fees" }) });
  await treatmentFees.getByLabel("Treatment or charge 1", { exact: true }).fill("Acne scar treatment (one session)");
  await treatmentFees.getByLabel("Price in rupees for row 1", { exact: true }).fill("2500");
  await treatmentFees.getByRole("button", { name: "Save treatment fees" }).click();
  await expect(treatmentFees.getByText("Fees saved.")).toBeVisible();

  // Patients pay doctors directly, so payment details are required before verification.
  const payment = page.locator("form").filter({ has: page.getByRole("button", { name: "Save payment details" }) });
  await payment.getByLabel(/^UPI ID/).fill("newdoctor@okaxis");
  await payment.getByRole("button", { name: "Save payment details" }).click();
  await expect(payment.getByText("Payment details saved.")).toBeVisible();

  await page.goto("/doctor/schedule");
  await page.getByRole("group", { name: "Monday" }).getByRole("button", { name: "Add hours" }).click();
  await page.getByRole("group", { name: "Thursday" }).getByRole("button", { name: "Add hours" }).click();
  await page.getByRole("button", { name: "Save availability" }).click();
  await expect(page.getByText(/^Saved\. Free slots for the next 3 weeks/)).toBeVisible();

  await page.goto("/doctor/onboarding");
  const checklist = page.getByRole("list", { name: "Verification checklist" });
  await expect(checklist.getByText("Not done", { exact: true })).toHaveCount(0);
  await expect(checklist.getByText("Done", { exact: true })).toHaveCount(9);
  await expect(checklist.getByRole("listitem").last()).toContainText("Payment details (UPI or bank account)");
  await page.getByRole("button", { name: "Submit for verification" }).click();
  await expect(page.getByText(/^Submitted( on .+)?$/).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Submit for verification" })).toHaveCount(0);

  // 4. Not on the public site before approval.
  const visitor = await signedOutPage(browser);
  await dermatologyListing(visitor);
  await expect(visitor.getByRole("link", { name: doctorName, exact: true })).toHaveCount(0);
  await visitor.context().close();

  // 5. The admin verifies the registration and approves the doctor.
  const adminContext = await browser.newContext({ baseURL: BASE_URL, locale: "en-IN", timezoneId: "Asia/Kolkata" });
  const admin = await adminContext.newPage();
  await demoLogin(admin, "Aditi Rao");
  await admin.goto("/admin/verification");
  await admin.getByRole("link", { name: new RegExp(doctorName) }).click();
  await admin.waitForURL(/\/admin\/verification\/[0-9a-f-]{36}$/);
  await expect(admin.getByRole("heading", { level: 1 })).toHaveText(doctorName);

  const licenceCard = admin.locator("div.card").filter({ hasText: registration });
  await expect(licenceCard.getByLabel("Result")).toHaveValue("verified");
  await licenceCard.getByLabel("Register reference you checked").fill(`NMC Indian Medical Register search ${registration}`);
  await licenceCard.getByRole("button", { name: "Save", exact: true }).click();
  await expect(licenceCard.getByText("Licence updated.")).toBeVisible();
  await expect(licenceCard.getByText(/checked .+: NMC Indian Medical Register search/)).toBeVisible();

  const decision = admin.locator("form").filter({ has: admin.getByRole("button", { name: "Save decision" }) });
  await expect(decision.getByRole("radio", { name: "Approve and make the doctor live" })).toBeChecked();
  await decision.getByRole("button", { name: "Save decision" }).click();
  await expect(decision.getByText("Decision saved and the doctor was notified.")).toBeVisible();
  await adminContext.close();

  // 6. Now listed publicly, with a working profile page and photo.
  const after = await signedOutPage(browser);
  await dermatologyListing(after);
  const link = after.getByRole("link", { name: doctorName, exact: true });
  await expect(link).toBeVisible();
  await link.click();
  await after.waitForURL(/\/doctors\/dr-meera-kapoor-/);
  await expect(after.getByRole("heading", { level: 1 })).toHaveText(doctorName);
  const photo = after.locator('img[src^="/api/doctor-photos/"]').first();
  await expect(photo).toBeVisible();
  const src = await photo.getAttribute("src");
  const res = await after.request.get(src!);
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toMatch(/^image\//);
  await after.context().close();
});
