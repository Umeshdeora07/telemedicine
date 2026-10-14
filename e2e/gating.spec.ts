import { expect, test } from "@playwright/test";

test.beforeEach(async ({ context }) => {
  await context.addCookies([{ name: "cookie_choice", value: "essential", url: process.env.BASE_URL ?? "http://localhost:3000" }]);
});

test("a patient in New York only sees New York-licensed doctors", async ({ page }) => {
  await page.goto("/doctors?for=US-NY");
  await expect(page.getByRole("link", { name: /Dr\. Rajesh Iyer/ }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /Dr\. Kavita Sharma/ })).toHaveCount(0);
});

test("a patient in Bangladesh is offered safe alternatives instead of doctors", async ({ page }) => {
  await page.goto("/doctors?for=BD");
  await expect(page.getByText(/treatment in India/i).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /Dr\. Kavita Sharma/ })).toHaveCount(0);
});

test("red-flag symptoms send people to emergency care, not booking", async ({ page }) => {
  await page.goto("/emergency");
  await expect(page.getByRole("link", { name: /112/ }).first()).toBeVisible();
});
