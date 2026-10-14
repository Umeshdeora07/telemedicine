import type { Metadata } from "next";
import { getI18n } from "@/i18n/server";
import { getSpecialties } from "@/server/queries/reference";
import { Card } from "@/components/ui/card";
import { TriageFlow } from "./triage-flow";

export const metadata: Metadata = { title: "Check your symptoms", description: "A few quick questions to find the right doctor and how soon to be seen." };

export default async function TriagePage() {
  const { t } = await getI18n();
  const specs = await getSpecialties();
  return (
    <div className="container-page max-w-2xl py-8">
      <h1 className="mb-1 text-2xl font-extrabold sm:text-3xl">{t("Which doctor do I need?")}</h1>
      <p className="mb-6 text-fg-muted">{t("Answer 5 quick questions. We'll suggest the right kind of doctor and how soon to be seen.")}</p>
      <Card className="p-5 sm:p-6">
        <TriageFlow specialtyNames={Object.fromEntries(specs.map((s) => [s.slug, s.name]))} />
      </Card>
    </div>
  );
}
