import { expect, type Page } from "@playwright/test";

/** Sign in with one of the demo accounts listed on the login page. */
export async function demoLogin(page: Page, name: string) {
  await page.context().addCookies([{ name: "cookie_choice", value: "essential", url: process.env.BASE_URL ?? "http://localhost:3000" }]);
  await page.goto("/login");
  await page.getByRole("button", { name: new RegExp(name) }).first().click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 60_000 });
}

export async function expectNoA11yBasics(page: Page) {
  // Every page has one h1 and a main landmark.
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.locator("main")).toHaveCount(1);
}
