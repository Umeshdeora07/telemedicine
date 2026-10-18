import Link from "next/link";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ChevronDown, Lock } from "lucide-react";
import { getI18n } from "@/i18n/server";
import { env } from "@/config/env";
import { brand } from "@/config/brand";
import { DIAL_CODES } from "@/config/dial-codes";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { buttonClass } from "@/components/ui/button";
import { oauthConfigured } from "@/server/auth/oauth";
import { demoLogin } from "@/server/actions/auth";
import { getSession } from "@/server/auth/session";
import { homeFor } from "@/server/auth/roles";
import { LoginForm } from "./login-form";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("Log in or create an account") };
}

/** Seeded accounts for checking the site before launch. Shown only in demo mode. */
const TEST_ACCOUNTS = [
  { label: "Asha Verma", note: "Patient, 62, prefers Hindi", phone: "+919810000001" },
  { label: "Rahul Mehta", note: "Patient with wife and son", phone: "+919810000002" },
  { label: "Sunita Rao", note: "Diabetes review with a general physician", phone: "+919810000003" },
  { label: "Arjun Nair", note: "Son in London, parents in Kochi", phone: "+447700900123" },
  { label: "Fatima Rahman", note: "Planning treatment in India, from Dhaka", phone: "+8801711000000" },
  { label: "Daniel Otieno", note: "Online consultation from Nairobi", phone: "+254700000100" },
  { label: "Vikram Singh", note: "Needs a clinic visit", phone: "+919810000009" },
  { label: "Dr. Kavita Sharma", note: "Doctor (general physician)", email: "kavita-sharma@doctors.caremitra.example" },
  { label: "Dr. Harpreet Gill", note: "Doctor (orthopaedics, treatment in India cases)", email: "harpreet-gill@doctors.caremitra.example" },
  { label: "Ira Banerjee", note: "Clinical psychologist", email: "ira-banerjee@doctors.caremitra.example" },
  { label: "Nisha Malhotra", note: "Hospital coordinator, Sunrise Valley", email: "coordinator@sunrisevalley.example" },
  { label: "Ravi Kumar", note: "Care coordinator", email: "care@caremitra.example" },
  { label: "Aditi Rao", note: "Super admin", email: "admin@caremitra.example" },
];

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { t } = await getI18n();
  const session = await getSession();
  if (session && !sp.next) redirect(homeFor(session.user.role));
  // Suggest the visitor's dialling code from the host's country header, else India.
  const h = await headers();
  const country = (h.get("x-vercel-ip-country") || h.get("cf-ipcountry") || "").trim().toUpperCase();
  const defaultDial = DIAL_CODES.find((d) => d.country === country)?.code ?? "+91";
  const errors: Record<string, string> = {
    oauth_not_configured: t("That sign in option is not available. Please use your mobile number or email."),
    oauth_state: t("Signing in took too long. Please try again."),
    oauth_failed: t("We could not sign you in with that account. Please try again."),
    suspended: t("This account is suspended. Please contact support."),
    demo: t("Test account not found. Run npm run db:reset."),
  };
  const nextQuery = sp.next ? `?next=${encodeURIComponent(sp.next)}` : "";
  const google = oauthConfigured("google");
  const apple = oauthConfigured("apple");
  return (
    <div className="mx-auto max-w-md space-y-6">
      <Card className="space-y-6 p-6 sm:p-8">
        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold sm:text-3xl">{t("Log in or create an account")}</h1>
          <p className="text-fg-muted">{t("Use your mobile number or email. We will send you a one time code, so you do not need a password.")}</p>
        </div>
        {sp.reason === "idle" ? <Alert tone="info">{t("You were logged out after a period of inactivity, to keep your information safe.")}</Alert> : null}
        {sp.error && errors[sp.error] ? <Alert tone="danger">{errors[sp.error]}</Alert> : null}
        <LoginForm next={sp.next} defaultDial={defaultDial} />
        {google || apple ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm text-fg-muted" aria-hidden>
              <span className="h-px flex-1 bg-line" />
              {t("or")}
              <span className="h-px flex-1 bg-line" />
            </div>
            {google ? (
              <a href={`/api/auth/oauth/google${nextQuery}`} className={buttonClass("outline", "lg", "w-full")}>
                {t("Continue with Google")}
              </a>
            ) : null}
            {apple ? (
              <a href={`/api/auth/oauth/apple${nextQuery}`} className={buttonClass("outline", "lg", "w-full")}>
                {t("Continue with Apple")}
              </a>
            ) : null}
          </div>
        ) : null}
        <p className="text-sm text-fg-muted">
          {t("By continuing you agree to the {brand} Terms of use and Privacy policy.", { brand: brand.name })}{" "}
          <Link href="/legal/terms" className="text-primary underline">
            {t("Terms of use")}
          </Link>
          {", "}
          <Link href="/legal/privacy" className="text-primary underline">
            {t("Privacy policy")}
          </Link>
        </p>
      </Card>
      <p className="flex items-center justify-center gap-2 text-center text-sm text-fg-muted">
        <Lock className="size-4 shrink-0 text-primary" aria-hidden />
        {t("Your details are encrypted and never sold.")}
      </p>
      {env.demoMode ? (
        <details id="test-accounts" className="group rounded-2xl border border-line bg-surface">
          <summary className="tap flex cursor-pointer list-none items-center justify-between gap-3 px-5 font-semibold text-heading [&::-webkit-details-marker]:hidden">
            {t("Test accounts")}
            <ChevronDown className="size-5 shrink-0 text-fg-muted transition-transform group-open:rotate-180" aria-hidden />
          </summary>
          <div className="space-y-3 px-5 pb-5">
            <p className="text-sm text-fg-muted">{t("For checking the site while it is being set up. Hidden when the site goes live.")}</p>
            <ul className="grid gap-2">
              {TEST_ACCOUNTS.map((a) => (
                <li key={a.label}>
                  <form action={demoLogin}>
                    {a.email ? <input type="hidden" name="email" value={a.email} /> : <input type="hidden" name="phone" value={a.phone} />}
                    <input type="hidden" name="next" value={sp.next ?? ""} />
                    <button type="submit" className="tap w-full rounded-xl border border-line px-3 py-2 text-start hover:border-primary hover:bg-surface-2">
                      <span className="block font-semibold text-heading">{a.label}</span>
                      <span className="block text-sm text-fg-muted">{t(a.note)}</span>
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          </div>
        </details>
      ) : null}
    </div>
  );
}
