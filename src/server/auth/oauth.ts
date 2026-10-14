import "server-only";
import { Apple, Google, decodeIdToken, generateCodeVerifier, generateState } from "arctic";
import { env } from "@/config/env";

export type Provider = "google" | "apple";

export function oauthConfigured(p: Provider) {
  if (p === "google") return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  return Boolean(process.env.APPLE_CLIENT_ID && process.env.APPLE_TEAM_ID && process.env.APPLE_KEY_ID && process.env.APPLE_PRIVATE_KEY);
}

const redirectUri = (p: Provider) => `${env.appUrl}/api/auth/oauth/${p}/callback`;

function google() {
  return new Google(process.env.GOOGLE_CLIENT_ID!, process.env.GOOGLE_CLIENT_SECRET!, redirectUri("google"));
}

function apple() {
  const pem = process.env.APPLE_PRIVATE_KEY!.replace(/\\n/g, "\n");
  const b64 = pem.replace(/-----[^-]+-----/g, "").replace(/\s/g, "");
  return new Apple(process.env.APPLE_CLIENT_ID!, process.env.APPLE_TEAM_ID!, process.env.APPLE_KEY_ID!, new Uint8Array(Buffer.from(b64, "base64")), redirectUri("apple"));
}

export function authorizationUrl(p: Provider) {
  const state = generateState();
  if (p === "google") {
    const verifier = generateCodeVerifier();
    const url = google().createAuthorizationURL(state, verifier, ["openid", "email", "profile"]);
    url.searchParams.set("prompt", "select_account");
    return { url, state, verifier };
  }
  const url = apple().createAuthorizationURL(state, ["name", "email"]);
  url.searchParams.set("response_mode", "form_post");
  return { url, state, verifier: "" };
}

export async function exchangeCode(p: Provider, code: string, verifier: string) {
  const tokens = p === "google" ? await google().validateAuthorizationCode(code, verifier) : await apple().validateAuthorizationCode(code);
  const claims = decodeIdToken(tokens.idToken()) as { sub: string; email?: string; email_verified?: boolean | string; name?: string };
  return {
    sub: claims.sub,
    email: claims.email?.toLowerCase(),
    emailVerified: claims.email_verified === true || claims.email_verified === "true",
    name: claims.name,
  };
}
