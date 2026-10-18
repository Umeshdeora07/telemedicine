import type { Metadata } from "next";
import Link from "next/link";
import { ChevronDown, PhoneCall, ShieldAlert, Siren } from "lucide-react";
import { getI18n } from "@/i18n/server";
import { getViewContext } from "@/server/context";
import { JsonLd } from "@/components/common/json-ld";
import { ContactCards } from "@/components/support/company-details";
import { grievance } from "@/components/support/brand-info";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    title: t("Help centre"),
    description: t("Answers about online consultations, treatment in India, payments, refunds and privacy."),
  };
}

export default async function HelpPage() {
  const { t } = await getViewContext();
  const groups: { id: string; title: string; items: { q: string; a: string }[] }[] = [
    {
      id: "online",
      title: t("Online consultation"),
      items: [
        {
          q: t("How do I book an online consultation?"),
          a: t("Choose a specialty and a doctor, pick a time and pay. You get a confirmation by text message and email with a link to join the video call."),
        },
        {
          q: t("Can I consult a doctor from outside India?"),
          a: t("Yes. You can book from any country. Every doctor on our site is registered in India and consults under India's telemedicine rules, wherever you live."),
        },
        {
          q: t("Will a prescription from an Indian doctor work in my country?"),
          a: t("Your doctor is registered in India. If you live outside India, a prescription from an Indian doctor may not be accepted by pharmacies in your country. Your doctor will give you a written treatment plan that you can share with your local doctor."),
        },
        {
          q: t("Do I need to install an app?"),
          a: t("No. The video call opens in the web browser on your phone, tablet or laptop. Use the camera and microphone check before the call. On a slow connection you can switch to audio only."),
        },
        {
          q: t("Can a family member join the call?"),
          a: t("Yes. Use “Invite family or interpreter” in the waiting room to send a one time link. You can also book for a family member from your profile."),
        },
        {
          q: t("Is the call recorded?"),
          a: t("No, unless you and your doctor both agree during the call. If you say no, the consultation continues normally."),
        },
      ],
    },
    {
      id: "india",
      title: t("Treatment in India"),
      items: [
        {
          q: t("How do I get a treatment plan?"),
          a: t("Send your medical reports from the Treatment in India page. A specialist reviews them for free and usually replies within 2 working days with a written treatment plan and a cost estimate in your currency."),
        },
        {
          q: t("Do I have to choose a hospital myself?"),
          a: t("No. We help you choose a hospital that suits your treatment and budget. You can check its accreditation, such as NABH or JCI, yourself before you decide."),
        },
        {
          q: t("Can you help with the medical visa?"),
          a: t("Yes. Once you accept the plan, the hospital issues a medical visa invitation letter for India's e-Medical visa. Up to two family members can apply for the e-Medical Attendant visa."),
        },
        {
          q: t("What help do I get when I arrive?"),
          a: t("We can arrange airport pickup, a place to stay near the hospital and an interpreter on request. A coordinator stays in touch with you throughout, and you can have online follow up consultations after you return home."),
        },
      ],
    },
    {
      id: "payments",
      title: t("Payments and refunds"),
      items: [
        {
          q: t("When do I pay?"),
          a: t("You pay when you book, and you see the full price in your currency before you pay. We release the fee to the doctor only after the consultation takes place."),
        },
        {
          q: t("What if the doctor does not join?"),
          a: t("If your doctor does not join within 10 minutes of the start time, you get a full refund automatically. Refunds go back to the same card, UPI or bank account, usually within 5 to 7 working days."),
        },
        {
          q: t("Can I cancel or change my booking?"),
          a: t("Yes, from My consultations. You see the exact rules before you pay. If you cancel before the free cancellation time shown when you book, you get a full refund."),
        },
        {
          q: t("Do I get an invoice?"),
          a: t("Yes. A GST invoice for every payment is under Payments in your account. It is useful for insurance claims."),
        },
      ],
    },
    {
      id: "privacy",
      title: t("Privacy"),
      items: [
        {
          q: t("Who can see my records?"),
          a: t("You, the family members you allow, and the doctors you consult. A doctor sees your past records only if you choose to share them. You can stop sharing at any time."),
        },
        {
          q: t("Is my data safe?"),
          a: t("Your records are encrypted and stored securely in India. We never sell your data, and we do not use health data for advertising."),
        },
        {
          q: t("Can I download or delete my data?"),
          a: t("Yes. Go to Settings, then Privacy, to download a copy of your data or delete your account."),
        },
      ],
    },
  ];
  return (
    <div className="container-page space-y-8 py-8 sm:py-10">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: groups.flatMap((g) => g.items.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } }))),
        }}
      />
      <div className="max-w-2xl space-y-2">
        <h1 className="text-3xl font-extrabold sm:text-4xl">{t("How can we help?")}</h1>
        <p className="text-lg text-fg-muted">{t("Find answers below, or talk to our team in English or Hindi.")}</p>
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-danger bg-danger-soft p-4" role="note">
        <Siren className="mt-0.5 size-6 shrink-0 text-danger" aria-hidden />
        <p className="font-semibold text-heading">{t("This service is not for emergencies. In an emergency, go to the nearest hospital or call your local emergency number.")}</p>
      </div>

      <nav aria-label={t("Topics")} className="flex flex-wrap gap-2">
        {groups.map((g) => (
          <a key={g.id} href={`#${g.id}`} className="tap inline-flex items-center rounded-full border border-line bg-surface px-4 font-semibold text-heading hover:border-primary">
            {g.title}
          </a>
        ))}
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0 space-y-8">
          {groups.map((g) => (
            <section key={g.id} aria-labelledby={g.id} className="scroll-mt-24 space-y-3">
              <h2 id={g.id} className="text-2xl font-extrabold">
                {g.title}
              </h2>
              <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
                {g.items.map(({ q, a }) => (
                  <details key={q} className="group">
                    <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-semibold text-heading hover:bg-surface-2 [&::-webkit-details-marker]:hidden">
                      <span>{q}</span>
                      <ChevronDown className="size-5 shrink-0 text-primary transition-transform group-open:rotate-180" aria-hidden />
                    </summary>
                    <p className="px-5 pb-5 text-fg-muted">{a}</p>
                  </details>
                ))}
              </div>
            </section>
          ))}
        </div>
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <section aria-labelledby="talk" className="card space-y-3 p-5">
            <h2 id="talk" className="flex items-center gap-2 text-lg font-bold">
              <PhoneCall className="size-5 text-primary" aria-hidden />
              {t("Talk to our team")}
            </h2>
            <p className="text-fg-muted">{t("Tell us when to call and we will call you back.")}</p>
            <Link href="/help/callback" className="tap inline-flex items-center font-semibold text-primary underline">
              {t("Request a call back")}
            </Link>
            <ContactCards t={t} className="grid gap-2" />
          </section>
          <section aria-labelledby="complain" className="card space-y-2 p-5">
            <h2 id="complain" className="flex items-center gap-2 text-lg font-bold">
              <ShieldAlert className="size-5 text-primary" aria-hidden />
              {t("Not happy with something?")}
            </h2>
            <p className="text-fg-muted">
              {t("Raise a complaint. We acknowledge it within {h} hours and resolve it within {d} days. Our grievance officer oversees every complaint.", { h: grievance.acknowledgeHours, d: grievance.resolveDays })}
            </p>
            <Link href="/help/contact" className="tap inline-flex items-center font-semibold text-primary underline">
              {t("Raise a complaint")}
            </Link>
            <Link href="/help/complaints" className="block text-sm text-primary underline">
              {t("Track a complaint")}
            </Link>
          </section>
        </aside>
      </div>
    </div>
  );
}
