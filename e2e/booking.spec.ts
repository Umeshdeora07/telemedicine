import { expect, test } from "@playwright/test";
import { demoLogin } from "./helpers";

test("patient books a video consult, pays and fills the pre-consult form", async ({ page }) => {
  await demoLogin(page, "Rahul Mehta");
  await page.goto("/doctors/dr-kavita-sharma");
  await page.getByRole("link", { name: /Consult · / }).first().click();
  await page.waitForURL(/\/book\//);
  await page.getByRole("radio").first().click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForURL(/details/);
  await page.getByRole("button", { name: /Continue to payment/ }).click();
  await page.waitForURL(/review/);
  // Full price breakdown before paying.
  await expect(page.getByText(/Platform fee/i).first()).toBeVisible();
  await page.getByRole("button", { name: /Pay .* securely/ }).click();
  await page.waitForURL(/\/pay\//);
  await page.getByRole("button", { name: /Simulate successful payment/ }).click();
  await page.waitForURL(/done/);
  await page.getByLabel(/main problem/i).fill("Headache and mild fever since yesterday");
  await page.getByLabel(/Since when/i).fill("2 days");
  await page.getByLabel(/I agree to this teleconsultation/).check();
  await page.getByRole("button", { name: /Send to doctor/ }).click();
  await expect(page.getByText(/(will read this before the consult|Your details are with the doctor)/).first()).toBeVisible();
});
