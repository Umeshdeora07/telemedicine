import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";

/**
 * Creating an account and logging in with an email or mobile number and a
 * password: the way in on a site without an email, SMS or Google service.
 */

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const PASSWORD = "lantern-orchid-41";

const uniqueEmail = () => `pw.${Date.now().toString(36)}${randomUUID().slice(0, 6)}@example.com`;
// 987xxxxxxx: never one of the seeded demo numbers (+9198100000xx).
const uniqueMobile = () => `987${String((Date.now() + Math.floor(Math.random() * 1000)) % 1e7).padStart(7, "0")}`;

type Intent = "Log in" | "Create account";
type Contact = "Email" | "Mobile number";

async function essentialCookiesOnly(page: Page) {
  await page.context().addCookies([{ name: "cookie_choice", value: "essential", url: BASE_URL }]);
}

/** Forget the session, as on a new device. */
async function signOutHere(page: Page) {
  await page.context().clearCookies();
  await essentialCookiesOnly(page);
}

/** Open the login page and choose Log in or Create account, and Email or Mobile number. */
async function openForm(page: Page, intent: Intent, contact: Contact) {
  await page.goto("/login");
  // Demo mode can show login codes, so the code form comes first; the password form is one click away.
  // Clicking until it switches also shows the page is interactive.
  const email = page.getByRole("radio", { name: "Email", exact: true });
  await expect(async () => {
    const instead = page.getByRole("button", { name: "Log in with a password instead" });
    if (await instead.isVisible()) await instead.click();
    await email.click({ timeout: 1_000 });
    await expect(email).toHaveAttribute("aria-checked", "true", { timeout: 1_000 });
  }).toPass();
  const tab = page.getByRole("tab", { name: intent, exact: true });
  await tab.click();
  await expect(tab).toHaveAttribute("aria-selected", "true");
  const radio = page.getByRole("radio", { name: contact, exact: true });
  await radio.click();
  await expect(radio).toHaveAttribute("aria-checked", "true");
}

async function submit(page: Page, intent: Intent, contact: Contact, identifier: string, password: string) {
  await openForm(page, intent, contact);
  await page.locator("#pw-identifier").fill(identifier);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: intent, exact: true }).click();
}

const notOnLogin = (u: URL) => !u.pathname.startsWith("/login");

async function signUp(page: Page, contact: Contact, identifier: string, password = PASSWORD) {
  await submit(page, "Create account", contact, identifier, password);
  await page.waitForURL((u) => u.pathname === "/onboarding");
}

test.beforeEach(async ({ page }) => {
  await essentialCookiesOnly(page);
});

test("a new person creates an account with an email and password, logs out and logs in again", async ({ page }) => {
  const email = uniqueEmail();
  await signUp(page, "Email", email);

  // Onboarding, kept to what is required.
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Welcome! Tell us a little about you");
  await page.getByLabel("Your full name").fill("Meena Password");
  await page.getByLabel("Date of birth").fill("1990-06-15");
  await page.getByLabel("Sex", { exact: true }).selectOption("female");
  await page.getByLabel(/I agree to the/).check();
  await page.getByLabel(/online consultations have limits/).check();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.waitForURL((u) => u.pathname === "/dashboard");

  // Log out from the account menu.
  await page.getByRole("button", { name: /Account menu for Meena Password/ }).click();
  await page.getByRole("button", { name: "Log out" }).click();
  await page.waitForURL((u) => u.pathname === "/");
  await page.goto("/dashboard");
  await page.waitForURL((u) => u.pathname === "/login");

  // Log in again with the password; the email's case does not matter.
  await submit(page, "Log in", "Email", email.toUpperCase(), PASSWORD);
  await page.waitForURL(notOnLogin);
  await expect(page).toHaveURL(/\/dashboard$/);
});

test("a wrong password says they don't match and keeps the email typed", async ({ page }) => {
  const email = uniqueEmail();
  await signUp(page, "Email", email);
  await signOutHere(page);

  await submit(page, "Log in", "Email", email, "not-the-password");
  await expect(page.getByText("That email or number and password don't match. Please try again.")).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("radio", { name: "Email", exact: true })).toHaveAttribute("aria-checked", "true");
  await expect(page.locator("#pw-identifier")).toHaveValue(email);
  await expect(page.locator("#password")).toHaveAttribute("aria-invalid", "true");

  // An account that does not exist gets the same answer.
  await submit(page, "Log in", "Email", uniqueEmail(), PASSWORD);
  await expect(page.getByText("That email or number and password don't match. Please try again.")).toBeVisible();

  // The right password still works afterwards.
  await submit(page, "Log in", "Email", email, PASSWORD);
  await page.waitForURL(notOnLogin);
  await expect(page).toHaveURL(/\/onboarding$/);
});

test("creating an account with an email that already has one says it already exists", async ({ page }) => {
  const email = uniqueEmail();
  await signUp(page, "Email", email);
  await signOutHere(page);

  await submit(page, "Create account", "Email", email, "another-choice-12");
  await expect(page.getByText("An account with this email or number already exists. Please log in instead.")).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
  await expect(page.locator("#pw-identifier")).toHaveValue(email);

  // The first password still logs in; the second one was never set.
  await submit(page, "Log in", "Email", email, "another-choice-12");
  await expect(page.getByText("That email or number and password don't match. Please try again.")).toBeVisible();
});

test("a weak password is refused when creating an account", async ({ page }) => {
  await submit(page, "Create account", "Email", uniqueEmail(), "password1");
  await expect(page.getByText("That password is too easy to guess. Please choose another.")).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

test("Show password switches the password between hidden and shown", async ({ page }) => {
  await openForm(page, "Log in", "Email");
  const input = page.locator("#password");
  await input.fill(PASSWORD);
  await expect(input).toHaveAttribute("type", "password");
  const show = page.getByLabel("Show password");
  await show.check();
  await expect(input).toHaveAttribute("type", "text");
  await expect(input).toHaveValue(PASSWORD);
  await show.uncheck();
  await expect(input).toHaveAttribute("type", "password");
});

test("a new person creates an account with a mobile number and password", async ({ page }) => {
  const mobile = uniqueMobile();
  await signUp(page, "Mobile number", mobile);
  await signOutHere(page);

  // Spaces in the number are fine.
  await submit(page, "Log in", "Mobile number", `${mobile.slice(0, 5)} ${mobile.slice(5)}`, PASSWORD);
  await page.waitForURL(notOnLogin);
  await expect(page).toHaveURL(/\/onboarding$/);
  await signOutHere(page);

  // The same number with the country code already has an account.
  await submit(page, "Create account", "Mobile number", `+91${mobile}`, "another-choice-12");
  await expect(page.getByText("An account with this email or number already exists. Please log in instead.")).toBeVisible();
  await expect(page.getByRole("radio", { name: "Mobile number", exact: true })).toHaveAttribute("aria-checked", "true");
  await expect(page.locator("#pw-identifier")).toHaveValue(`+91${mobile}`);
});

test("a signed in person changes their password with the current one", async ({ page }) => {
  const email = uniqueEmail();
  await signUp(page, "Email", email);

  await page.goto("/password");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Change your password");
  await expect(page.getByText(`You log in with ${email} and this password.`)).toBeVisible();
  const next = page.locator("#password");
  // Show password on this page too (and the form is ready once it works).
  await expect(async () => {
    await page.getByLabel("Show password").click();
    await expect(next).toHaveAttribute("type", "text", { timeout: 1_000 });
  }).toPass();
  await expect(page.locator("#current")).toHaveAttribute("type", "text");

  // A wrong current password is refused.
  await page.locator("#current").fill("not-the-password");
  await next.fill("harbour-violet-77");
  await page.getByRole("button", { name: "Save password" }).click();
  await expect(page.getByText("Your current password is not right.")).toBeVisible();

  await page.locator("#current").fill(PASSWORD);
  await next.fill("harbour-violet-77");
  await page.getByRole("button", { name: "Save password" }).click();
  await expect(page.getByText("Your password is saved. Other devices were logged out.")).toBeVisible();
  // Still logged in here.
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Change your password");

  // Only the new password logs in now.
  await signOutHere(page);
  await submit(page, "Log in", "Email", email, PASSWORD);
  await expect(page.getByText("That email or number and password don't match. Please try again.")).toBeVisible();
  await submit(page, "Log in", "Email", email, "harbour-violet-77");
  await page.waitForURL(notOnLogin);
  await expect(page).toHaveURL(/\/onboarding$/);
});

test("the country code chosen stays after a wrong password", async ({ page }) => {
  await openForm(page, "Log in", "Mobile number");
  await page.getByLabel("Country code").first().selectOption("+44");
  await page.locator("#pw-identifier").fill("7700900999");
  await page.locator("#password").fill("not-the-password");
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page.getByText("That email or number and password don't match. Please try again.")).toBeVisible();
  await expect(page.getByLabel("Country code").first()).toHaveValue("+44");
  await expect(page.locator("#pw-identifier")).toHaveValue("7700900999");
});

test("errors from Log in are not shown on Create account", async ({ page }) => {
  await submit(page, "Log in", "Email", uniqueEmail(), "not-the-password");
  const message = page.getByText("That email or number and password don't match. Please try again.");
  await expect(message).toBeVisible();
  await page.getByRole("tab", { name: "Create account", exact: true }).click();
  await expect(message).toHaveCount(0);
});

test("forgot password: a one time code gets them back in to choose a new password", async ({ page }) => {
  const email = uniqueEmail();
  await signUp(page, "Email", email);
  await signOutHere(page);

  await openForm(page, "Log in", "Email");
  await page.getByRole("button", { name: "Forgot your password?" }).click();
  await page.getByRole("button", { name: "Get a one time code" }).click();
  await page.getByRole("tab", { name: "Email" }).click();
  await page.locator("#identifier").fill(email);
  await page.getByRole("button", { name: "Send code" }).click();
  // Demo mode shows the code on the page.
  const shown = await page.getByText(/here is your code/).textContent();
  const code = /(\d{6})/.exec(shown ?? "")?.[1];
  expect(code, "one time code shown on the page").toBeTruthy();
  await page.locator("#code").fill(code!);
  await page.getByRole("button", { name: "Verify and continue" }).click();
  // Not onboarded yet, so onboarding comes first and then the password page.
  await page.waitForURL((u) => u.pathname === "/onboarding" && u.searchParams.get("next") === "/password");

  // The code proved the address, so the old password is gone and a new one needs no current one.
  await page.goto("/password");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Add a password");
  await expect(page.locator("#current")).toHaveCount(0);
  await page.locator("#password").fill("meadow-copper-58");
  await page.getByRole("button", { name: "Save password" }).click();
  await expect(page.getByText("Your password is saved. Other devices were logged out.")).toBeVisible();

  await signOutHere(page);
  await submit(page, "Log in", "Email", email, PASSWORD);
  await expect(page.getByText("That email or number and password don't match. Please try again.")).toBeVisible();
  await submit(page, "Log in", "Email", email, "meadow-copper-58");
  await page.waitForURL(notOnLogin);
});
