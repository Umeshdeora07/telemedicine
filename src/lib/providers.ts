/**
 * Which outside services are set up, from settings alone. Kept free of
 * imports so the proxy and the setup checks can use it cheaply.
 */
const set = (...names: string[]) => names.every((n) => Boolean(process.env[n]));

/** Plain text messages through Twilio. */
export const smsConfigured = () => set("TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_FROM");

/** Twilio Verify: Twilio creates, sends and checks the login code. */
export const verifyConfigured = () => set("TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_VERIFY_SERVICE_SID");

/** Login codes can reach a phone number. */
export const phoneCodesConfigured = () => verifyConfigured() || smsConfigured();

export const resendConfigured = () => set("RESEND_API_KEY", "EMAIL_FROM");

/** Any mail account by SMTP, for example Gmail with an app password. */
export const smtpConfigured = () => set("SMTP_USER", "SMTP_PASSWORD");

export const emailConfigured = () => resendConfigured() || smtpConfigured();
