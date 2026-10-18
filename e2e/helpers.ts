import { expect, type Page } from "@playwright/test";

/** Sign in with one of the test accounts listed in the "Test accounts" panel on the login page (demo mode only). */
export async function demoLogin(page: Page, name: string) {
  await page.context().addCookies([{ name: "cookie_choice", value: "essential", url: process.env.BASE_URL ?? "http://localhost:3000" }]);
  await page.goto("/login");
  // The accounts sit in a collapsed <details>; open it first.
  const panel = page.locator("details#test-accounts");
  if (!(await panel.evaluate((el) => (el as HTMLDetailsElement).open))) await panel.locator("summary").click();
  await panel.getByRole("button", { name: new RegExp(name) }).first().click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 60_000 });
}

export async function expectNoA11yBasics(page: Page) {
  // Every page has one h1 and a main landmark.
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.locator("main")).toHaveCount(1);
}
