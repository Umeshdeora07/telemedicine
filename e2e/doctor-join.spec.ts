import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { demoLogin } from "./helpers";

/**
 * How a new doctor joins: the admin sends a link with the doctor's name and
 * specialty filled in, the doctor creates an account and goes straight to the
 * doctor form (no patient questions), then the doctor checklist.
 */

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

test("the admin sends a join link and the doctor signs up through it", async ({ page, browser }) => {
  await demoLogin(page, "Aditi Rao");
  await page.goto("/admin/verification");
  await expect(page.getByRole("heading", { name: "Add a new doctor" })).toBeVisible();
  await page.getByLabel("Doctor's full name").fill("Dr. Join Test");
  await page.locator("#join-spec").selectOption("dermatology");
  const link = await page.getByLabel("Link for the doctor").inputValue();
  expect(link).toContain("/for-doctors/apply?");
  const url = new URL(link);
  expect(url.searchParams.get("name")).toBe("Dr. Join Test");
  expect(url.searchParams.get("specialty")).toBe("dermatology");

  // The doctor opens it on their own device.
  const doctor = await (await browser.newContext()).newPage();
  await doctor.context().addCookies([{ name: "cookie_choice", value: "essential", url: BASE_URL }]);
  await doctor.goto(url.pathname + url.search);
  await doctor.waitForURL((u) => u.pathname === "/login" && (u.searchParams.get("next") ?? "").startsWith("/for-doctors/apply"));
  await expect(doctor.getByText("Joining as a doctor")).toBeVisible();

  // Demo mode offers codes first; use a password here. The password form opens on Create account.
  await expect(async () => {
    await doctor.getByRole("button", { name: "Log in with a password instead" }).click({ timeout: 1_000 });
    await expect(doctor.getByRole("tab", { name: "Create account", exact: true })).toHaveAttribute("aria-selected", "true", { timeout: 1_000 });
  }).toPass();
  await doctor.getByRole("radio", { name: "Email", exact: true }).click();
  await doctor.locator("#pw-identifier").fill(`join.${randomUUID().slice(0, 8)}@example.com`);
  await doctor.locator("#password").fill("scalpel-harbour-63");
  await doctor.getByRole("button", { name: "Create account", exact: true }).click();

  // Straight to the doctor form, with the name and specialty from the link.
  await doctor.waitForURL((u) => u.pathname === "/for-doctors/apply");
  await expect(doctor.getByLabel("Full name as registered")).toHaveValue("Dr. Join Test");
  await expect(doctor.getByLabel("Main specialty")).toHaveValue("dermatology");
  await expect(doctor.getByRole("heading", { name: "Keep these ready" })).toBeVisible();
  await doctor.getByLabel(/I agree to verification/).check();
  await doctor.getByRole("button", { name: "Continue", exact: true }).click();
  await doctor.waitForURL((u) => u.pathname === "/doctor/onboarding");
});

test("the login page points doctors to joining", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("link", { name: "Join as a doctor" }).click();
  await page.waitForURL((u) => u.pathname === "/for-doctors");
  await expect(page.getByRole("heading", { name: "Keep these ready" })).toBeVisible();
});
