import { afterEach, describe, expect, it } from "vitest";
import { databaseUrl, setupProblems } from "@/lib/setup-check";

const saved = { ...process.env };
const KEYS = [
  "DATABASE_URL", "POSTGRES_URL", "STORAGE_DATABASE_URL", "STORAGE_DATABASE_URL_UNPOOLED", "STORAGE_POSTGRES_URL", "ANALYTICS_DATABASE_URL",
  "VERCEL", "VERCEL_ENV", "APP_SECRET", "DEMO_MODE", "NODE_ENV", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET",
  "TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_VERIFY_SERVICE_SID", "SMTP_USER", "SMTP_PASSWORD", "PASSWORD_LOGIN",
];
afterEach(() => {
  for (const k of KEYS) delete process.env[k];
  Object.assign(process.env, saved);
});
function setEnv(vars: Record<string, string | undefined>) {
  for (const k of KEYS) delete process.env[k];
  for (const [k, v] of Object.entries(vars)) if (v !== undefined) process.env[k] = v;
}

describe("databaseUrl", () => {
  it("prefers DATABASE_URL", () => {
    setEnv({ DATABASE_URL: "postgres://a", STORAGE_DATABASE_URL: "postgres://b" });
    expect(databaseUrl()).toEqual({ url: "postgres://a", name: "DATABASE_URL" });
  });
  it("finds a prefixed name from Vercel's storage integrations, pooled before unpooled", () => {
    setEnv({ STORAGE_DATABASE_URL_UNPOOLED: "postgres://direct", STORAGE_POSTGRES_URL: "postgres://legacy", STORAGE_DATABASE_URL: "postgres://pooled" });
    expect(databaseUrl()).toEqual({ url: "postgres://pooled", name: "STORAGE_DATABASE_URL" });
  });
  it("doesn't guess between two prefixed databases", () => {
    setEnv({ STORAGE_DATABASE_URL: "postgres://a", ANALYTICS_DATABASE_URL: "postgres://b" });
    expect(databaseUrl()).toBeNull();
  });
  it("is null when nothing is set", () => {
    setEnv({});
    expect(databaseUrl()).toBeNull();
  });
});

describe("setupProblems", () => {
  const ids = () => setupProblems().map((p) => p.id);
  it("lists everything missing on a fresh Vercel project", () => {
    setEnv({ VERCEL: "1", NODE_ENV: "production" });
    expect(ids()).toEqual(["secret-missing", "database-missing"]);
  });
  it("lets people log in with a password with no other service set up", () => {
    setEnv({ VERCEL: "1", VERCEL_ENV: "production", NODE_ENV: "production", APP_SECRET: "x".repeat(40), DATABASE_URL: "postgres://a" });
    expect(ids()).toEqual([]);
    setEnv({ VERCEL: "1", VERCEL_ENV: "production", NODE_ENV: "production", APP_SECRET: "x".repeat(40), DATABASE_URL: "postgres://a", PASSWORD_LOGIN: "false" });
    expect(ids()).toEqual(["no-sign-in"]);
  });
  it("asks only for the database once the settings are in", () => {
    setEnv({ VERCEL: "1", NODE_ENV: "production", DEMO_MODE: "true", APP_SECRET: "x".repeat(40) });
    expect(ids()).toEqual(["database-missing"]);
  });
  it("asks which database to use when two are connected", () => {
    setEnv({ VERCEL: "1", NODE_ENV: "production", DEMO_MODE: "true", APP_SECRET: "x".repeat(40), STORAGE_DATABASE_URL: "postgres://a", ANALYTICS_DATABASE_URL: "postgres://b" });
    expect(ids()).toEqual(["database-ambiguous"]);
  });
  it("counts Google sign-in as a way to log in", () => {
    setEnv({ VERCEL: "1", NODE_ENV: "production", APP_SECRET: "x".repeat(40), DATABASE_URL: "postgres://a", PASSWORD_LOGIN: "false", GOOGLE_CLIENT_ID: "id", GOOGLE_CLIENT_SECRET: "secret" });
    expect(ids()).toEqual([]);
  });
  it("counts Twilio Verify and Gmail codes as ways to log in", () => {
    const base = { VERCEL: "1", NODE_ENV: "production", APP_SECRET: "x".repeat(40), DATABASE_URL: "postgres://a", PASSWORD_LOGIN: "false" };
    setEnv({ ...base, TWILIO_ACCOUNT_SID: "AC1", TWILIO_AUTH_TOKEN: "t", TWILIO_VERIFY_SERVICE_SID: "VA1" });
    expect(ids()).toEqual([]);
    setEnv({ ...base, SMTP_USER: "me@gmail.com", SMTP_PASSWORD: "abcd efgh ijkl mnop" });
    expect(ids()).toEqual([]);
  });
  it("needs a real way to log in on the production site, even with DEMO_MODE=true", () => {
    setEnv({ VERCEL: "1", VERCEL_ENV: "production", NODE_ENV: "production", DEMO_MODE: "true", PASSWORD_LOGIN: "false", APP_SECRET: "x".repeat(40), DATABASE_URL: "postgres://a" });
    expect(ids()).toEqual(["no-sign-in"]);
  });
  it("never shows the secret's length", () => {
    setEnv({ VERCEL: "1", NODE_ENV: "production", DEMO_MODE: "true", APP_SECRET: "short", DATABASE_URL: "postgres://a" });
    expect(JSON.stringify(setupProblems())).not.toMatch(/\b5\b/);
  });
  it("flags a short secret", () => {
    setEnv({ VERCEL: "1", NODE_ENV: "production", DEMO_MODE: "true", APP_SECRET: "short", DATABASE_URL: "postgres://a" });
    expect(ids()).toEqual(["secret-short"]);
  });
  it("is happy when everything is set", () => {
    setEnv({ VERCEL: "1", NODE_ENV: "production", DEMO_MODE: "true", APP_SECRET: "x".repeat(40), STORAGE_DATABASE_URL: "postgres://a" });
    expect(ids()).toEqual([]);
  });
  it("needs nothing for a local demo on the built-in database", () => {
    setEnv({ NODE_ENV: "development" });
    expect(ids()).toEqual([]);
  });
});

describe("two step verification", () => {
  it("is needed for doctors and coordinators but not for the super admin, unless ADMIN_TWO_STEP=true", async () => {
    const { needsTwoStep } = await import("@/server/auth/roles");
    delete process.env.ADMIN_TWO_STEP;
    expect(needsTwoStep("doctor")).toBe(true);
    expect(needsTwoStep("care_coordinator")).toBe(true);
    expect(needsTwoStep("clinic_coordinator")).toBe(true);
    expect(needsTwoStep("patient")).toBe(false);
    expect(needsTwoStep("super_admin")).toBe(false);
    process.env.ADMIN_TWO_STEP = "true";
    expect(needsTwoStep("super_admin")).toBe(true);
    delete process.env.ADMIN_TWO_STEP;
  });
});
