import type { Metadata } from "next";
import Link from "next/link";
import { Mail, MessageCircle, Phone, PhoneCall, ShieldAlert, Siren } from "lucide-react";
import { getViewContext } from "@/server/context";
import { brand } from "@/config/brand";
import { PageHeader } from "@/components/ui/page-header";
import { JsonLd } from "@/components/common/json-ld";

export const metadata: Metadata = { title: "Help centre", description: "Answers about booking, payments, refunds, video calls, prescriptions and privacy." };

export default async function HelpPage() {
  const { t } = await getViewContext();
  const groups: [string, [string, string][]][] = [
    [t("Booking"), [
      [t("How do I book a doctor?"), t("Search by symptom or specialty, choose a doctor and a time, add the patient's details and pay. You get a confirmation by SMS and email with a link to join.")],
      [t("Can I book for my parents in India from abroad?"), t("Yes. Add them under Family. Adults confirm with a code sent to their phone. The consult follows India's rules because they are in India, and you can join the call from anywhere.")],
      [t("Which doctors can I see if I live outside India?"), t("Doctors licensed in your country, if we have them, and Indian doctors for things allowed across borders (like a second opinion on reports or planning treatment in India). Choose your location at the top of the doctor search.")],
    ]],
    [t("Payments and refunds"), [
      [t("When am I charged?"), t("When you book. We hold the money and release it to the doctor only after the consult happens.")],
      [t("What if the doctor doesn't join?"), t("If the doctor doesn't join within 10 minutes of the start time, you get a full refund automatically, back to the same card or UPI in 5–7 working days.")],
      [t("Can I cancel or reschedule?"), t("Yes. You see the exact rules before you pay. Reschedule free up to a few hours before; cancellation refunds depend on how early you cancel.")],
      [t("Do I get a GST invoice?"), t("Yes, for every payment, under Payments and invoices. Useful for insurance claims.")],
    ]],
    [t("Video calls"), [
      [t("The video isn't working"), t("Use the Test my camera and mic button before the call. On a slow connection, switch to audio only — the call continues. You can also use chat in the same room.")],
      [t("Can a family member join?"), t("Yes. Use “Invite family” in the waiting room to send a one-time link. You can also ask for an interpreter when you book.")],
      [t("Is the call recorded?"), t("No, unless you and the doctor both agree in the call. You can say no and the consult continues normally.")],
    ]],
    [t("Prescriptions"), [
      [t("Will I always get a prescription?"), t("Only if the doctor thinks it's safe to treat you online. Some medicines can't be prescribed online by law; the doctor will suggest a clinic visit if needed.")],
      [t("Will the pharmacy accept it?"), t("Yes. It carries the doctor's registration number and digital signature, and a QR code the pharmacist can scan to check it's genuine.")],
    ]],
    [t("Privacy"), [
      [t("Who can see my records?"), t("You, family members you allow, and the doctors you consult (only for that consult, unless you choose to share past records). You can see and stop sharing any time.")],
      [t("Can I download or delete my data?"), t("Yes. Go to Settings → Your data.")],
    ]],
  ];
  return (
    <div className="container-page space-y-8 py-8">
      <JsonLd data={{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: groups.flatMap(([, qs]) => qs.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } }))) }} />
      <PageHeader title={t("How can we help?")} description={t("Real people answer, in English, Hindi and more.")} />
      <div className="card flex flex-wrap items-center gap-3 border-danger p-4">
        <Siren className="size-6 text-danger" aria-hidden />
        <p className="flex-1 font-semibold">{t("Medical emergency? Don't wait for us.")}</p>
        <Link href="/emergency" className="tap inline-flex items-center rounded-xl bg-danger-solid px-4 font-bold text-on-danger">{t("Emergency help")}</Link>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <li><Link href="/help/callback" className="card flex h-full items-center gap-3 p-4 hover:border-primary"><PhoneCall className="size-6 text-primary" aria-hidden /><span><span className="block font-semibold">{t("Request a call back")}</span><span className="text-sm text-fg-muted">{t("We call you, in your language")}</span></span></Link></li>
        <li><a href={`https://wa.me/${brand.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener" className="card flex h-full items-center gap-3 p-4 hover:border-primary"><MessageCircle className="size-6 text-primary" aria-hidden /><span><span className="block font-semibold">WhatsApp</span><span className="text-sm text-fg-muted">{brand.whatsapp}</span></span></a></li>
        <li><a href={`tel:${brand.supportPhone.replace(/\s/g, "")}`} className="card flex h-full items-center gap-3 p-4 hover:border-primary"><Phone className="size-6 text-primary" aria-hidden /><span><span className="block font-semibold">{t("Call us")}</span><span className="text-sm text-fg-muted">{brand.supportPhone}</span></span></a></li>
        <li><a href={`mailto:${brand.supportEmail}`} className="card flex h-full items-center gap-3 p-4 hover:border-primary"><Mail className="size-6 text-primary" aria-hidden /><span><span className="block font-semibold">{t("Email")}</span><span className="text-sm text-fg-muted">{brand.supportEmail}</span></span></a></li>
      </ul>
      <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          {groups.map(([title, qs]) => (
            <section key={title} className="space-y-2">
              <h2 className="text-xl font-bold">{title}</h2>
              {qs.map(([q, a]) => (
                <details key={q} className="card p-4">
                  <summary className="tap flex cursor-pointer list-none items-center font-semibold">{q}</summary>
                  <p className="mt-2 text-fg-muted">{a}</p>
                </details>
              ))}
            </section>
          ))}
        </div>
        <aside className="card h-fit space-y-2 p-5">
          <p className="flex items-center gap-2 font-semibold"><ShieldAlert className="size-5 text-primary" aria-hidden />{t("Not happy with something?")}</p>
          <p className="text-sm text-fg-muted">{t("Raise a complaint. We reply within 24 hours and resolve within 15 days. Our grievance officer oversees every complaint.")}</p>
          <Link href="/help/contact" className="font-semibold text-primary underline">{t("Raise a complaint")}</Link>
          <Link href="/help/complaints" className="block text-sm text-primary underline">{t("Track a complaint")}</Link>
        </aside>
      </div>
    </div>
  );
}
