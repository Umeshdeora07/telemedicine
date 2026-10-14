import type { Metadata } from "next";
import { Building2, CalendarCheck, ClipboardList, FileText, Globe2, MessageSquareText, Plane, QrCode, Search, ShieldCheck, Users, Video } from "lucide-react";
import { getViewContext } from "@/server/context";
import { PageHeader } from "@/components/ui/page-header";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = { title: "How it works", description: "Online consults, clinic visits, booking for family abroad, and treatment in India — step by step." };

function Steps({ steps }: { steps: { Icon: typeof Search; title: string; body: string }[] }) {
  return (
    <ol className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {steps.map(({ Icon, title, body }, i) => (
        <li key={title} className="card space-y-2 p-5">
          <span className="flex items-center gap-2"><span className="grid size-8 place-items-center rounded-full bg-primary text-sm font-bold text-on-primary">{i + 1}</span><Icon className="size-5 text-primary" aria-hidden /></span>
          <h3 className="font-bold">{title}</h3>
          <p className="text-fg-muted">{body}</p>
        </li>
      ))}
    </ol>
  );
}

export default async function HowItWorks() {
  const { t } = await getViewContext();
  return (
    <div className="container-page space-y-14 py-8">
      <PageHeader title={t("How it works")} description={t("Simple steps, clear prices, and a real doctor at every step.")} />
      <section id="online" className="scroll-mt-24 space-y-4">
        <h2 className="text-2xl font-bold">{t("See a doctor online")}</h2>
        <Steps steps={[
          { Icon: Search, title: t("Find a doctor"), body: t("Search by symptom or specialty. Every doctor is verified, and you see fees, languages and next free time.") },
          { Icon: CalendarCheck, title: t("Book and pay"), body: t("Pick video, audio or chat and a time. Pay by UPI or card. If the doctor doesn't join, you're refunded automatically.") },
          { Icon: ClipboardList, title: t("Tell the doctor first"), body: t("Answer a few questions and upload reports so the doctor is ready. Test your camera before the call.") },
          { Icon: FileText, title: t("Consult and get your plan"), body: t("Talk to the doctor, get an e-prescription if it's safe, a written summary, and free follow-up chat.") },
        ]} />
      </section>
      <section id="clinic" className="scroll-mt-24 space-y-4">
        <h2 className="text-2xl font-bold">{t("When you need to be examined")}</h2>
        <Steps steps={[
          { Icon: Video, title: t("Online first"), body: t("Start online. If the doctor needs to examine you, they recommend a clinic visit.") },
          { Icon: Building2, title: t("Book the visit in one tap"), body: t("Same doctor or the right specialist, at a partner clinic near you. Your online fee can count towards the visit.") },
          { Icon: QrCode, title: t("Show your visit pass"), body: t("A QR pass checks you in at reception — no paperwork. It works even without internet.") },
          { Icon: ShieldCheck, title: t("One record"), body: t("The clinic doctor sees your online notes and reports, so you don't repeat your story.") },
        ]} />
      </section>
      <section id="family" className="scroll-mt-24 space-y-4">
        <h2 className="text-2xl font-bold">{t("Caring for parents in India from abroad")}</h2>
        <Steps steps={[
          { Icon: Users, title: t("Add your parents"), body: t("They agree with a code sent to their phone. You choose what you can do: book, join calls, see records.") },
          { Icon: Globe2, title: t("Book in your currency"), body: t("See prices in GBP, USD, AED and more. Times show in both your time zone and theirs.") },
          { Icon: Video, title: t("Join the same call"), body: t("Be in the video consult from London or Dubai while your mother sits with the doctor online in Kochi.") },
          { Icon: MessageSquareText, title: t("Stay in the loop"), body: t("Get the prescription, reminders and follow-up messages on your phone too.") },
        ]} />
      </section>
      <section id="international" className="scroll-mt-24 space-y-4">
        <h2 className="text-2xl font-bold">{t("Coming to India for treatment")}</h2>
        <Steps steps={[
          { Icon: FileText, title: t("Send your reports"), body: t("A care coordinator replies in 24 hours. A specialist reviews your case.") },
          { Icon: ClipboardList, title: t("Get a plan and estimate"), body: t("Clear treatment plan, days in hospital and in India, and a cost range in your currency.") },
          { Icon: Plane, title: t("Visa letter and travel"), body: t("The hospital issues your e-Medical visa letter. We help with pickup, stay and an interpreter.") },
          { Icon: ShieldCheck, title: t("Treatment and follow-up"), body: t("Track every step in the app. Get your records to take home, and follow up from home where allowed.") },
        ]} />
        <ButtonLink href="/international">{t("Learn more")}</ButtonLink>
      </section>
    </div>
  );
}
