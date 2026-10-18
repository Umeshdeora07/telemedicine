import type { Metadata } from "next";
import Link from "next/link";
import { Clock, MapPin, ShieldAlert } from "lucide-react";
import { getI18n } from "@/i18n/server";
import { getViewContext } from "@/server/context";
import { PHOTOS } from "@/config/images";
import { Photo } from "@/components/ui/photo";
import { CallbackForm } from "@/components/support/support-forms";
import { CompanyDetails, ContactCards } from "@/components/support/company-details";
import { grievance, hasCompanyDetails, supportContacts } from "@/components/support/brand-info";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    title: t("Contact us"),
    description: t("Talk to our team about an online consultation or treatment in India. Ask for a call back and we will call you at a time that suits you."),
  };
}

export default async function Contact({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  const sp = await searchParams;
  const { t, user, locale } = await getViewContext();
  const contacts = supportContacts();
  return (
    <>
      <section aria-labelledby="title" className="bg-primary-soft">
        <div className="container-page grid items-center gap-8 py-10 sm:py-12 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="min-w-0 space-y-4">
            <nav aria-label={t("Breadcrumb")} className="text-sm text-fg-muted">
              <Link href="/" className="hover:underline">
                {t("Home")}
              </Link>{" "}
              › <span aria-current="page">{t("Contact us")}</span>
            </nav>
            <h1 id="title" className="text-[2rem] font-extrabold leading-tight sm:text-5xl">
              {t("Contact us")}
            </h1>
            <p className="max-w-xl text-lg text-fg sm:text-xl">
              {t("We can help you choose a doctor, book a consultation or plan your treatment in India.")}
            </p>
            <p className="flex items-start gap-2 text-fg-muted">
              <Clock className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
              {t("We reply to messages within one working day. Call backs are made between 8 am and 10 pm India time.")}
            </p>
          </div>
          <div className="relative hidden aspect-[4/3] overflow-hidden rounded-3xl shadow-card lg:block">
            <Photo photo="support" alt={t(PHOTOS.support.alt)} sizes="(min-width: 1024px) 32vw, 100vw" className="absolute inset-0" />
          </div>
        </div>
      </section>

      <div className="container-page grid gap-8 py-10 lg:grid-cols-[1fr_22rem]">
        <div className="min-w-0 space-y-8">
          {contacts.length ? (
            <section aria-labelledby="reach" className="space-y-3">
              <h2 id="reach" className="text-2xl font-extrabold">
                {t("Write or call us")}
              </h2>
              <ContactCards t={t} />
            </section>
          ) : null}

          <section aria-labelledby="callback" className="space-y-3">
            <h2 id="callback" className="text-2xl font-extrabold">
              {t("Request a call back")}
            </h2>
            <p className="text-fg-muted">{t("Leave your number and tell us when to call. A member of our team will call you back.")}</p>
            <div className="card p-5 sm:p-6">
              <CallbackForm
                reason={sp.reason}
                defaults={{ name: user?.name ?? "", phone: user?.phone ?? "", language: user?.language === "hi" || locale === "hi" ? "hi" : "en" }}
                languages={[
                  { code: "en", name: "English" },
                  { code: "hi", name: "Hindi" },
                ]}
              />
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <section aria-labelledby="complain" className="card space-y-2 p-5">
            <h2 id="complain" className="flex items-center gap-2 text-lg font-bold">
              <ShieldAlert className="size-5 text-primary" aria-hidden />
              {t("Not happy with something?")}
            </h2>
            <p className="text-fg-muted">
              {t("Raise a complaint. We acknowledge it within {h} hours and resolve it within {d} days.", { h: grievance.acknowledgeHours, d: grievance.resolveDays })}
            </p>
            <Link href="/help/contact" className="tap inline-flex items-center font-semibold text-primary underline">
              {t("Raise a complaint")}
            </Link>
            <Link href="/help/complaints" className="block text-sm text-primary underline">
              {t("Track a complaint")}
            </Link>
          </section>
          {hasCompanyDetails() ? (
            <section aria-labelledby="company" className="card space-y-3 p-5">
              <h2 id="company" className="flex items-center gap-2 text-lg font-bold">
                <MapPin className="size-5 text-primary" aria-hidden />
                {t("Company details")}
              </h2>
              <CompanyDetails t={t} className="grid gap-4" />
            </section>
          ) : null}
          <p className="text-sm text-fg-muted">
            {t("Need answers fast?")}{" "}
            <Link href="/help" className="font-semibold text-primary underline">
              {t("Read our help centre")}
            </Link>
          </p>
        </aside>
      </div>
    </>
  );
}
