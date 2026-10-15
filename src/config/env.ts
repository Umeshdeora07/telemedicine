/** Typed access to environment settings, with safe local defaults. */
const bool = (v: string | undefined, fallback: boolean) =>
  v === undefined || v === "" ? fallback : ["1", "true", "yes", "on"].includes(v.toLowerCase());

export const env = {
  get isProd() {
    return process.env.NODE_ENV === "production";
  },
  /** Demo mode: shows demo logins and OTP codes, uses the test payment page. Never enable for real patients. */
  get demoMode() {
    return bool(process.env.DEMO_MODE, process.env.NODE_ENV !== "production");
  },
  /** Public address. Falls back to the address Vercel, Render or Railway give the service. */
  get appUrl() {
    const host = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.RAILWAY_PUBLIC_DOMAIN;
    return (process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || (host ? `https://${host}` : "") || "http://localhost:3000").replace(/\/$/, "");
  },
  /** Secure cookies whenever the site is served over HTTPS (not just in production builds). */
  get secureCookies() {
    return this.appUrl.startsWith("https://");
  },
  get cronSecret() {
    return process.env.CRON_SECRET || "";
  },
  get platformFeeInrMinor() {
    return Number(process.env.PLATFORM_FEE_INR_PAISE || 2500); // ₹25 + GST
  },
  get gstRate() {
    return Number(process.env.GST_RATE || 0.18);
  },
  get platformState() {
    return process.env.PLATFORM_GST_STATE || "Karnataka";
  },
  get commissionRate() {
    return Number(process.env.DOCTOR_COMMISSION_RATE || 0.15);
  },
  get noShowMinutes() {
    return Number(process.env.DOCTOR_NO_SHOW_MINUTES || 10);
  },
  get sessionIdleMinutesStaff() {
    return Number(process.env.SESSION_IDLE_MINUTES_STAFF || 15);
  },
  get sessionIdleMinutesPatient() {
    return Number(process.env.SESSION_IDLE_MINUTES_PATIENT || 60 * 24 * 14);
  },
  get turn() {
    return {
      urls: process.env.TURN_URLS ? process.env.TURN_URLS.split(",") : [],
      username: process.env.TURN_USERNAME || "",
      credential: process.env.TURN_CREDENTIAL || "",
    };
  },
  get stunUrls() {
    return (process.env.STUN_URLS || "stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302").split(",");
  },
};
