"use client";

import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/client";
import { TechCheck } from "@/components/room/tech-check";

export function TechCheckOnly({ backHref }: { backHref: string }) {
  const { t } = useI18n();
  const router = useRouter();
  return (
    <TechCheck
      wantVideo
      joinLabel={t("Looks good — done")}
      onReady={(c) => {
        c.stream?.getTracks().forEach((tr) => tr.stop());
        router.push(backHref);
      }}
    />
  );
}
