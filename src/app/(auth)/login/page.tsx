import type { Metadata } from "next";
import { getI18n } from "@/i18n/server";
import { env } from "@/config/env";
import { brand } from "@/config/brand";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { oauthConfigured } from "@/server/auth/oauth";
import { demoLogin } from "@/server/actions/auth";
import { getSession } from "@/server/auth/session";
import { homeFor } from "@/server/auth/roles";
import { redirect } from "next/navigation";
import { buttonClass } from "@/components/ui/button";
import { LoginForm } from "./login-form";
import { getDeclaredLocation } from "@/lib/prefs";
import { DIAL_CODES } from "@/config/dial-codes";

export const metadata: Metadata = { title: "Log in" };

const DEMO_ACCOUNTS = [
  { label: "Asha Verma", note: "Patient, 62, prefers Hindi", phone: "+919810000001" },
  { label: "Rahul Mehta", note: "Patient with wife and son", phone: "+919810000002" },
  { label: "Arjun Nair", note: "Son in London, parents in Kochi", phone: "+447700900123" },
  { label: "Fatima Rahman", note: "International patient, Dhaka", phone: "+8801711000000" },
  { label: "John Carter", note: "Patient in New York", phone: "+12125550100" },
  { label: "Vikram Singh", note: "Needs a clinic visit", phone: "+919810000009" },
  { label: "Dr. Kavita Sharma", note: "Doctor (general physician)", email: "kavita-sharma@doctors.caremitra.example" },
  { label: "Dr. Rajesh Iyer", note: "Doctor (cardiology, licensed in NY/NJ)", email: "rajesh-iyer@doctors.caremitra.example" },
  { label: "Nisha Malhotra", note: "Hospital coordinator, Sunrise Valley", email: "coordinator@sunrisevalley.example" },
  { label: "Ravi Kumar", note: "Care coordinator", email: "care@caremitra.example" },
  { label: "Aditi Rao", note: "Super admin", email: "admin@caremitra.example" },
];

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { t } = await getI18n();
  const session = await getSession();
  if (session && !sp.next) redirect(homeFor(session.user.role));
  const loc = await getDeclaredLocation();
  const defaultDial = DIAL_CODES.find((d) => d.country === loc?.country)?.code ?? "+91";
  const errors: Record<string, string> = {
    oauth_not_configured: t("That sign-in option isn't set up yet. Please use your mobile number or email."),
    oauth_state: t("Sign-in timed out. Please try again."),
    oauth_failed: t("We couldn't sign you in with that account. Please try again."),
    suspended: t("This account is suspended. Please contact support."),
    demo: t("Demo account not found. Run npm run db:reset."),
  };
  return (
    <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[minmax(0,28rem)_1fr]">
      <Card className="space-y-6 p-6 sm:p-8">
        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold">{t("Log in or sign up")}</h1>
          <p className="text-fg-muted">{t("Use the same number for your whole family. You can add parents, children and others later.")}</p>
        </div>
        {sp.reason === "idle" ? <Alert tone="info">{t("You were logged out after a period of inactivity, to keep your information safe.")}</Alert> : null}
        {sp.error && errors[sp.error] ? <Alert tone="danger">{errors[sp.error]}</Alert> : null}
        <LoginForm next={sp.next} defaultDial={defaultDial} />
        {oauthConfigured("google") || oauthConfigured("apple") ? (
          <div className="space-y-3">
            <p className="text-center text-sm text-fg-muted">{t("or")}</p>
            {oauthConfigured("google") ? (
              <a href={`/api/auth/oauth/google${sp.next ? `?next=${encodeURIComponent(sp.next)}` : ""}`} className={buttonClass("outline", "lg", "w-full")}>
                {t("Continue with Google")}
              </a>
            ) : null}
            {oauthConfigured("apple") ? (
              <a href={`/api/auth/oauth/apple${sp.next ? `?next=${encodeURIComponent(sp.next)}` : ""}`} className={buttonClass("outline", "lg", "w-full")}>
                {t("Continue with Apple")}
              </a>
            ) : null}
          </div>
        ) : env.demoMode ? (
          <p className="text-center text-sm text-fg-muted">{t("Google and Apple sign-in appear here once their keys are configured.")}</p>
        ) : null}
        <p className="text-sm text-fg-muted">
          {t("By continuing you agree to the {brand} Terms and Privacy policy.", { brand: brand.name })}{" "}
          <a href="/legal/terms" className="text-primary underline">{t("Terms of use")}</a> ·{" "}
          <a href="/legal/privacy" className="text-primary underline">{t("Privacy policy")}</a>
        </p>
      </Card>
      {env.demoMode ? (
        <section aria-labelledby="demo-accounts" className="space-y-3">
          <h2 id="demo-accounts" className="text-lg font-bold">{t("Demo accounts")}</h2>
          <p className="text-fg-muted">{t("Try any journey without a code. Staff accounts skip the two-factor step in the demo.")}</p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {DEMO_ACCOUNTS.map((a) => (
              <li key={a.label}>
                <form action={demoLogin}>
                  {a.email ? <input type="hidden" name="email" value={a.email} /> : <input type="hidden" name="phone" value={a.phone} />}
                  <input type="hidden" name="next" value={sp.next ?? ""} />
                  <button type="submit" className="card tap w-full p-3 text-start hover:border-primary">
                    <span className="block font-semibold text-heading">{a.label}</span>
                    <span className="block text-sm text-fg-muted">{t(a.note)}</span>
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
