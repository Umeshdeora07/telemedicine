"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LocateFixed, MapPin } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { setLocationAction } from "@/server/actions/prefs";

export type LocOption = { code: string; name: string; scope: "country" | "region"; regions: { code: string; name: string }[] };

/** Detect the country/state from the device, via OpenStreetMap reverse geocoding (with permission). */
export async function detectLocation(): Promise<{ country: string; region: string | null } | null> {
  if (!("geolocation" in navigator)) return null;
  const pos = await new Promise<GeolocationPosition | null>((resolve) =>
    navigator.geolocation.getCurrentPosition(resolve, () => resolve(null), { timeout: 10000, maximumAge: 600000 }),
  );
  if (!pos) return null;
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=5&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`);
    const json = (await res.json()) as { address?: { country_code?: string; "ISO3166-2-lvl4"?: string } };
    const country = json.address?.country_code?.toUpperCase();
    if (!country) return null;
    return { country, region: json.address?.["ISO3166-2-lvl4"] ?? null };
  } catch {
    return null;
  }
}

/** "Where is the patient right now?" — changes which doctors and rules apply. */
export function LocationPicker({ options, current, param = "for", compact }: { options: LocOption[]; current: { country: string; region: string | null }; param?: string; compact?: boolean }) {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [country, setCountry] = useState(current.country);
  const [region, setRegion] = useState(current.region ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const opt = options.find((o) => o.code === country);

  const apply = (c: string, r: string | null) =>
    start(async () => {
      await setLocationAction(c, r);
      const q = new URLSearchParams(sp.toString());
      q.set(param, r || c);
      router.push(`${pathname}?${q.toString()}`);
    });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        apply(country, opt?.scope === "region" ? region || null : null);
      }}
      className={compact ? "flex flex-wrap items-end gap-2" : "grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"}
    >
      <div className="min-w-0 flex-1 space-y-1">
        <label htmlFor="loc-country" className="block text-sm font-medium text-heading">
          {t("Country")}
        </label>
        <Select
          id="loc-country"
          value={country}
          onChange={(e) => {
            setCountry(e.target.value);
            setRegion("");
          }}
        >
          {options.map((o) => (
            <option key={o.code} value={o.code}>
              {o.name}
            </option>
          ))}
        </Select>
      </div>
      {opt?.scope === "region" ? (
        <div className="min-w-0 flex-1 space-y-1">
          <label htmlFor="loc-region" className="block text-sm font-medium text-heading">
            {t("State / province")}
          </label>
          <Select id="loc-region" value={region} onChange={(e) => setRegion(e.target.value)} required>
            <option value="">{t("Choose")}</option>
            {opt.regions.map((r) => (
              <option key={r.code} value={r.code}>
                {r.name}
              </option>
            ))}
          </Select>
        </div>
      ) : compact ? null : (
        <div className="hidden sm:block" />
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          <MapPin className="size-4" aria-hidden />
          {t("Update")}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={async () => {
            setMsg(t("Finding your location…"));
            const found = await detectLocation();
            if (!found) return setMsg(t("We couldn't detect your location. Please choose it from the list."));
            const o = options.find((x) => x.code === found.country);
            if (!o) return setMsg(t("Your location ({country}) isn't supported yet.", { country: found.country }));
            setMsg(null);
            setCountry(found.country);
            setRegion(found.region ?? "");
            apply(found.country, o.scope === "region" ? found.region : null);
          }}
          aria-label={t("Use my current location")}
        >
          <LocateFixed className="size-4" aria-hidden />
          <span className="hidden sm:inline">{t("Use my location")}</span>
        </Button>
      </div>
      {msg ? (
        <p role="status" className="text-sm text-fg-muted sm:col-span-3">
          {msg}
        </p>
      ) : null}
    </form>
  );
}
