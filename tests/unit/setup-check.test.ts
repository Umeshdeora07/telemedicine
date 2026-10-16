import { afterEach, describe, expect, it } from "vitest";
import { databaseUrl, setupProblems } from "@/lib/setup-check";

const saved = { ...process.env };
const KEYS = ["DATABASE_URL", "POSTGRES_URL", "STORAGE_DATABASE_URL", "STORAGE_DATABASE_URL_UNPOOLED", "VERCEL", "APP_SECRET", "DEMO_MODE", "NODE_ENV"];
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
    setEnv({ STORAGE_DATABASE_URL_UNPOOLED: "postgres://direct", STORAGE_DATABASE_URL: "postgres://pooled" });
    expect(databaseUrl()).toEqual({ url: "postgres://pooled", name: "STORAGE_DATABASE_URL" });
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
    expect(ids()).toEqual(["secret-missing", "database-missing", "no-sign-in"]);
  });
  it("asks only for the database once the settings are in", () => {
    setEnv({ VERCEL: "1", NODE_ENV: "production", DEMO_MODE: "true", APP_SECRET: "x".repeat(40) });
    expect(ids()).toEqual(["database-missing"]);
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
