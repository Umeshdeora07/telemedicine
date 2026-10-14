import type { Metadata } from "next";
import { getI18n } from "@/i18n/server";
import { TechCheckOnly } from "./tech-check-only";

export const metadata: Metadata = { title: "Test camera and microphone" };

export default async function CheckPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { t } = await getI18n();
  return (
    <div className="container-page max-w-2xl space-y-4 py-8">
      <h1 className="text-2xl font-extrabold">{t("Test your camera, microphone and network")}</h1>
      <p className="text-fg-muted">{t("Do this a few minutes before your consult. Nothing is recorded or sent.")}</p>
      <TechCheckOnly backHref={`/consults/${id}`} />
    </div>
  );
}
