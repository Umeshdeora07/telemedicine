import { expect, test } from "@playwright/test";
import { demoLogin } from "./helpers";

test("care coordinator books a consult for a patient on a call", async ({ page }) => {
  await demoLogin(page, "Ravi Kumar");
  await page.goto("/coordinator/book?q=asha");
  await page.getByRole("link", { name: /Asha Verma/ }).first().click();
  await page.getByRole("button", { name: "Show doctors" }).click();
  await page.locator('a[href*="d="]').first().click();
  await page.waitForURL(/d=/);
  await page.locator('input[name="slotId"]').first().check();
  await page.getByLabel(/asked me to book this on the call/).check();
  await page.getByRole("button", { name: "Reserve and send payment link" }).click();
  await expect(page.getByText(/Booking CM-\w+ reserved/)).toBeVisible();
});
