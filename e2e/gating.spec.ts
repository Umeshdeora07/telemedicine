import { expect, test } from "@playwright/test";
import { demoLogin } from "./helpers";

test.beforeEach(async ({ context }) => {
  await context.addCookies([{ name: "cookie_choice", value: "essential", url: process.env.BASE_URL ?? "http://localhost:3000" }]);
});

test("the doctors page offers only the four specialties and no location questions", async ({ page }) => {
  await page.goto("/doctors");
  const tabs = page.getByRole("main").getByRole("navigation", { name: "Specialties" }).getByRole("link");
  await expect(tabs).toHaveText(["All", "Orthopaedics", "Dermatology", "General Physician", "Psychology"]);
  await expect(page.getByText(/location|where are you|time zone/i)).toHaveCount(0);
  await tabs.filter({ hasText: "Psychology" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Psychology/);
});

test("removed pages send visitors to the right place", async ({ page }) => {
  await page.goto("/hospitals");
  await expect(page).toHaveURL(/\/treatment-in-india$/);
  await page.goto("/international");
  await expect(page).toHaveURL(/\/treatment-in-india$/);
  await page.goto("/emergency");
  await expect(page).toHaveURL(/\/help$/);
});

test("the site starts in light mode and remembers dark mode", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).not.toHaveClass(/\bdark\b/);
  await page.getByRole("button", { name: "Dark mode" }).first().click();
  await expect(page.locator("html")).toHaveClass(/\bdark\b/);
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/\bdark\b/);
});

test("the language switch shows the site in Hindi and back in English", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /हिन्दी/ }).first().click();
  await expect(page.locator("html")).toHaveAttribute("lang", "hi");
  await page.getByRole("button", { name: /English/ }).first().click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("a patient living outside India books a video consultation", async ({ page }) => {
  await demoLogin(page, "Daniel Otieno");
  await page.goto("/doctors/dr-kavita-sharma");
  await page.getByRole("link", { name: /Book video consultation/ }).first().click();
  await page.waitForURL(/\/book\//);
  await page.getByRole("radio").first().click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForURL(/details/);
  await page.getByRole("button", { name: /Continue to payment/ }).click();
  await page.waitForURL(/review/);
  await expect(page.getByText(/registered in India/i).first()).toBeVisible();
  await page.getByRole("button", { name: /Pay .* securely/ }).click();
  await page.waitForURL(/\/pay\//);
  await page.getByRole("button", { name: /Simulate successful payment/ }).click();
  await page.waitForURL(/done/);
});

test("each kind of account opens its own dashboard after login", async ({ page }) => {
  for (const [name, path] of [
    ["Rahul Mehta", "/dashboard"],
    ["Dr. Kavita Sharma", "/doctor"],
    ["Aditi Rao", "/admin"],
  ] as const) {
    await page.context().clearCookies();
    await demoLogin(page, name);
    await expect(page).toHaveURL(new RegExp(`${path}$`));
  }
});
