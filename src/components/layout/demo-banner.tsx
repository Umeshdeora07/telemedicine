import { env } from "@/config/env";
import { getI18n } from "@/i18n/server";

export async function DemoBanner() {
  if (!env.demoMode) return null;
  const { t } = await getI18n();
  return (
    <div className="bg-accent text-on-accent">
      <p className="container-page py-1.5 text-center text-sm font-medium">
        {t("Demo version: doctors, clinics and patients are fictional. Do not use for real medical care.")}
      </p>
    </div>
  );
}
