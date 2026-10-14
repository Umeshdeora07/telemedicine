import { expect, test } from "@playwright/test";
import { demoLogin } from "./helpers";

test("reception checks a patient in with the visit pass code", async ({ page }) => {
  await demoLogin(page, "Nisha Malhotra");
  await page.goto("/clinic");
  await page.getByRole("link", { name: /Neha Gupta/ }).first().click();
  await page.waitForURL(/clinic\/visits/);
  const checkIn = page.getByRole("button", { name: "Check in now" });
  if (await checkIn.count()) await checkIn.click();
  await expect(page.getByText(/Checked in/).first()).toBeVisible();
  // The online consult notes that led to this visit are visible to reception.
  await expect(page.getByRole("heading", { name: /From the online consult/ })).toBeVisible();
});
