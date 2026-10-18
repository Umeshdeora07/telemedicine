import { expect, test, type Browser, type Page } from "@playwright/test";
import { demoLogin } from "./helpers";

/**
 * Patients pay some doctors directly (UPI or bank transfer). The patient
 * enters the payment reference, the doctor confirms (or says the money never
 * arrived) on /doctor/payments, and the booking follows that decision.
 */

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const DOCTOR = "Dr. Imran Qureshi";
const UPI_ID = "imran.qureshi.demo@upi";
const ACCOUNT_NUMBER = "000123456789";

/** A payment reference nobody else has used, so reruns against the same database stay unambiguous. */
const uniqueRef = () => `UTR${Date.now()}${Math.floor(Math.random() * 1000)}`;

async function newPage(browser: Browser) {
  const context = await browser.newContext({ baseURL: BASE_URL, locale: "en-IN", timezoneId: "Asia/Kolkata" });
  return context.newPage();
}

/** Book a video consultation with Dr. Imran Qureshi, pay him directly and return the appointment id. */
async function bookAndPayDirectly(page: Page, reference: string) {
  await page.goto("/doctors/dr-imran-qureshi");
  await page.getByRole("link", { name: /Book video consultation/ }).first().click();
  await page.waitForURL(/\/book\//);
  await page.getByRole("radio").first().click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForURL(/details/);
  await page.getByRole("button", { name: /Continue to payment/ }).click();
  await page.waitForURL(/review/);

  // No gateway: the patient pays the doctor.
  await expect(page.getByRole("button", { name: /Pay .* securely/ })).toHaveCount(0);
  await page.getByRole("button", { name: /Pay .+ to the doctor/ }).click();
  await page.waitForURL(/\/pay\/direct\/[0-9a-f-]{36}$/);

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(`Pay ${DOCTOR}`);
  await expect(page.getByRole("region", { name: "Amount to pay" })).toContainText("₹");
  await expect(page.getByText(UPI_ID, { exact: true })).toBeVisible();
  await expect(page.getByText(ACCOUNT_NUMBER, { exact: true })).toBeVisible();
  await expect(page.getByText("SMPL0001234", { exact: true })).toBeVisible();

  const how = page.getByRole("group", { name: "How did you pay?" });
  await expect(how.getByRole("radio", { name: "UPI" })).toBeChecked();
  await how.getByRole("radio", { name: "Bank transfer" }).check();
  await page.getByLabel(/^Payment reference/).fill(reference);
  await page.getByRole("button", { name: "I have paid" }).click();

  await page.waitForURL(/\/book\/done\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Thank you. Your payment is with the doctor");
  await expect(page.getByText(`Waiting for ${DOCTOR} to confirm`)).toBeVisible();
  await expect(page.getByText(reference)).toBeVisible();
  return new URL(page.url()).pathname.split("/").pop()!;
}

/** The doctor's entry for this payment on /doctor/payments. */
function paymentItem(doctor: Page, reference: string) {
  return doctor.getByRole("listitem").filter({ hasText: reference });
}

test("public profiles list treatment fees and never show a doctor's bank details", async ({ page, request }) => {
  await page.context().addCookies([{ name: "cookie_choice", value: "essential", url: BASE_URL }]);
  await page.goto("/doctors/dr-harpreet-gill");
  const fees = page.getByRole("region", { name: "Treatment and other fees" });
  await expect(fees).toBeVisible();
  await expect(fees.getByText("Knee replacement surgery (one knee)")).toBeVisible();

  await page.goto("/doctors/dr-imran-qureshi");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(DOCTOR);
  await expect(page.getByRole("region", { name: "Treatment and other fees" })).toBeVisible();
  const rendered = await page.content();
  expect(rendered).not.toContain(ACCOUNT_NUMBER);
  expect(rendered).not.toContain(UPI_ID);

  // The raw server response, including the inline page data, must not carry them either.
  const res = await request.get("/doctors/dr-imran-qureshi");
  expect(res.status()).toBe(200);
  const html = await res.text();
  expect(html).not.toContain(ACCOUNT_NUMBER);
  expect(html).not.toContain(UPI_ID);
  expect(html).not.toContain("SMPL0001234");
});

test("patient pays the doctor directly and the doctor confirms the booking", async ({ page, browser }) => {
  test.setTimeout(240_000);
  const reference = uniqueRef();

  await demoLogin(page, "Rahul Mehta");
  const apptId = await bookAndPayDirectly(page, reference);

  // Listed under My consultations while the doctor checks.
  await page.goto("/consults");
  const card = page.locator("article").filter({ has: page.locator(`a[href="/consults/${apptId}"]`) });
  await expect(card).toHaveCount(1);
  await expect(card.getByText("Payment sent, waiting for the doctor")).toBeVisible();

  // The doctor sees the reference and confirms the money arrived.
  const doctor = await newPage(browser);
  await demoLogin(doctor, DOCTOR);
  await doctor.goto("/doctor/payments");
  const item = paymentItem(doctor, reference);
  await expect(item).toHaveCount(1);
  await expect(item.getByText("Bank transfer")).toBeVisible();
  await item.getByRole("button", { name: "Payment received, confirm booking" }).click();
  await expect(paymentItem(doctor, reference)).toHaveCount(0);
  await doctor.reload();
  await expect(doctor.getByText(reference)).toHaveCount(0);
  await doctor.context().close();

  // The patient's booking is now confirmed.
  await page.goto(`/consults/${apptId}`);
  await expect(page.getByText("Confirmed", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Payment sent, waiting for the doctor")).toHaveCount(0);
});

test("doctor says the payment did not arrive and the booking is cancelled", async ({ page, browser }) => {
  test.setTimeout(240_000);
  const reference = uniqueRef();

  await demoLogin(page, "Rahul Mehta");
  const apptId = await bookAndPayDirectly(page, reference);

  const doctor = await newPage(browser);
  await demoLogin(doctor, DOCTOR);
  await doctor.goto("/doctor/payments");
  const item = paymentItem(doctor, reference);
  await expect(item).toHaveCount(1);
  await item.getByRole("button", { name: "Not received" }).click();
  await item.getByRole("textbox").fill("No payment with this reference reached my account");
  await item.getByRole("button", { name: "Payment not received, cancel booking" }).click();
  await expect(paymentItem(doctor, reference)).toHaveCount(0);
  await doctor.context().close();

  await page.goto(`/consults/${apptId}`);
  await expect(page.getByText("Cancelled", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Payment sent, waiting for the doctor")).toHaveCount(0);

  await page.goto("/consults?tab=cancelled");
  const card = page.locator("article").filter({ has: page.locator(`a[href="/consults/${apptId}"]`) });
  await expect(card).toHaveCount(1);
  await expect(card.getByText("Cancelled", { exact: true })).toBeVisible();

  await page.goto("/consults");
  await expect(page.locator(`a[href="/consults/${apptId}"]`)).toHaveCount(0);
});
