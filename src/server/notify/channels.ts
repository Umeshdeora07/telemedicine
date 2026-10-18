/**
 * Delivery channels. Each one uses a real provider when its keys are set and
 * otherwise logs to the server console (local demo). Providers:
 *   SMS       Twilio (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM)
 *             For India, register DLT templates with your SMS provider.
 *   Login     Twilio Verify (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN,
 *   by phone  TWILIO_VERIFY_SERVICE_SID) sends and checks the login codes
 *             itself, with Twilio's own message.
 *   WhatsApp  Meta WhatsApp Cloud API (WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID);
 *             business-initiated messages need approved templates.
 *   Email     Resend (RESEND_API_KEY, EMAIL_FROM), or any mail account by SMTP
 *             (SMTP_USER, SMTP_PASSWORD; SMTP_HOST defaults to Gmail)
 *   Push      Web Push with VAPID (VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT)
 */
import { env } from "@/config/env";
import { brand } from "@/config/brand";
import { resendConfigured, smtpConfigured } from "@/lib/providers";

export { emailConfigured, phoneCodesConfigured, smsConfigured, verifyConfigured } from "@/lib/providers";

type Result = { ok: true; id?: string; simulated?: boolean } | { ok: false; error: string };

/**
 * Without a provider the message is only logged. Outside local and demo runs
 * the log never holds the text or the full recipient: it may contain login
 * codes and health details, and hosted logs are widely readable.
 */
function log(channel: string, to: string, body: string) {
  if (process.env.NODE_ENV === "production" && !env.demoMode) {
    console.warn(`[notify:${channel}] no provider configured; not sent to …${to.slice(-4)}`);
    return;
  }
  console.log(`[notify:${channel}] → ${to}\n${body.split("\n").map((l) => "    " + l).join("\n")}`);
}

/** A call to Twilio Verify. A network failure reads as status 0. */
async function twilioVerify(path: "Verifications" | "VerificationCheck", params: Record<string, string>) {
  const sid = process.env.TWILIO_ACCOUNT_SID!;
  try {
    const res = await fetch(`https://verify.twilio.com/v2/Services/${process.env.TWILIO_VERIFY_SERVICE_SID}/${path}`, {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(params),
      signal: AbortSignal.timeout(15_000),
    });
    const json = (await res.json().catch(() => ({}))) as { status?: string; code?: number; message?: string };
    return { ok: res.ok, status: res.status, json };
  } catch (e) {
    return { ok: false, status: 0, json: { message: e instanceof Error ? e.message : String(e) } as { status?: string; code?: number; message?: string } };
  }
}

/** Ask Twilio Verify to text a login code to this number. */
export async function startPhoneVerification(to: string): Promise<Result> {
  const { ok, status, json } = await twilioVerify("Verifications", { To: to, Channel: "sms" });
  if (!ok) return { ok: false, error: `Twilio Verify ${status}: ${json.code ?? ""} ${json.message ?? ""}`.trim() };
  return { ok: true };
}

/** Check a code with Twilio Verify. "expired" also covers too many wrong tries. */
export async function checkPhoneVerification(to: string, code: string): Promise<"approved" | "wrong" | "expired" | "error"> {
  const { ok, status, json } = await twilioVerify("VerificationCheck", { To: to, Code: code });
  if (ok) return json.status === "approved" ? "approved" : json.status === "pending" ? "wrong" : "expired";
  if (status === 404 || status === 429) return "expired";
  console.error(`[notify:sms] Twilio Verify check failed: ${status} ${json.code ?? ""}`);
  return "error";
}

export async function sendSms(to: string, body: string): Promise<Result> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM;
  if (!sid || !token || !from) {
    log("sms", to, body);
    return { ok: true, simulated: true };
  }
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: to, From: from, Body: body }),
  });
  if (!res.ok) return { ok: false, error: `Twilio ${res.status}: ${await res.text()}` };
  const json = (await res.json()) as { sid?: string };
  return { ok: true, id: json.sid };
}

export async function sendWhatsApp(
  to: string,
  message: { template?: string; params?: string[]; language?: string; text: string },
): Promise<Result> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId) {
    log("whatsapp", to, message.text);
    return { ok: true, simulated: true };
  }
  const payload = message.template
    ? {
        messaging_product: "whatsapp",
        to: to.replace(/^\+/, ""),
        type: "template",
        template: {
          name: message.template,
          language: { code: message.language || "en" },
          components: message.params?.length
            ? [{ type: "body", parameters: message.params.map((p) => ({ type: "text", text: p })) }]
            : undefined,
        },
      }
    : { messaging_product: "whatsapp", to: to.replace(/^\+/, ""), type: "text", text: { body: message.text } };
  const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) return { ok: false, error: `WhatsApp ${res.status}: ${await res.text()}` };
  const json = (await res.json()) as { messages?: { id: string }[] };
  return { ok: true, id: json.messages?.[0]?.id };
}

export async function sendEmail(to: string, subject: string, text: string, html?: string): Promise<Result> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!resendConfigured() && smtpConfigured()) return sendSmtp(to, subject, text, html);
  if (!key || !from) {
    log("email", to, `Subject: ${subject}\n${text}`);
    return { ok: true, simulated: true };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, text, html }),
  });
  if (!res.ok) return { ok: false, error: `Resend ${res.status}: ${await res.text()}` };
  const json = (await res.json()) as { id?: string };
  return { ok: true, id: json.id };
}

/** Plain SMTP, for example a Gmail account with an app password. */
async function sendSmtp(to: string, subject: string, text: string, html?: string): Promise<Result> {
  const nodemailer = (await import("nodemailer")).default;
  const user = process.env.SMTP_USER!;
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT || 465);
  // Google shows app passwords in groups of four: "abcd efgh ijkl mnop".
  const pass = host === "smtp.gmail.com" ? process.env.SMTP_PASSWORD!.replace(/\s+/g, "") : process.env.SMTP_PASSWORD!;
  const transport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    // Fail fast rather than hold the login page for minutes.
    connectionTimeout: 15_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
  try {
    const info = await transport.sendMail({ from: process.env.EMAIL_FROM || `${brand.name} <${user}>`, to, subject, text, html });
    return { ok: true, id: info.messageId };
  } catch (e) {
    return { ok: false, error: `SMTP: ${e instanceof Error ? e.message : String(e)}` };
  } finally {
    transport.close();
  }
}

export function pushConfigured() {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

export async function sendPush(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: { title: string; body: string; url?: string },
): Promise<Result> {
  if (!pushConfigured()) {
    log("push", subscription.endpoint.slice(0, 40), `${payload.title}: ${payload.body}`);
    return { ok: true, simulated: true };
  }
  const webpush = (await import("web-push")).default;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@example.com",
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload), { TTL: 3600 });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
