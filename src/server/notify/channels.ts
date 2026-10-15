/**
 * Delivery channels. Each one uses a real provider when its keys are set and
 * otherwise logs to the server console (local demo). Providers:
 *   SMS       Twilio (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM)
 *             For India, register DLT templates with your SMS provider.
 *   WhatsApp  Meta WhatsApp Cloud API (WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID);
 *             business-initiated messages need approved templates.
 *   Email     Resend (RESEND_API_KEY, EMAIL_FROM)
 *   Push      Web Push with VAPID (VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT)
 */
import { env } from "@/config/env";

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

export function smsConfigured() {
  return Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM);
}

export function emailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
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
