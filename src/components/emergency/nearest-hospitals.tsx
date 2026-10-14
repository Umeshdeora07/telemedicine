"use client";

import { useState } from "react";
import { LocateFixed, MapPin, Navigation } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { Button } from "@/components/ui/button";
import { LazyMap } from "@/components/map/lazy-map";

type H = { name: string; address: string; lat: number; lng: number; phone: string | null; emergency24x7: boolean };

function km(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export function NearestHospitals({ hospitals }: { hospitals: H[] }) {
  const { t } = useI18n();
  const [me, setMe] = useState<{ lat: number; lng: number } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const list = me ? [...hospitals].map((h) => ({ ...h, d: km(me, h) })).sort((a, b) => a.d - b.d) : hospitals.map((h) => ({ ...h, d: null as number | null }));
  const mapsLink = me ? `https://www.google.com/maps/search/hospital/@${me.lat},${me.lng},14z` : "https://www.google.com/maps/search/?api=1&query=hospital+near+me";
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          onClick={() => {
            if (!("geolocation" in navigator)) return setMsg(t("Location isn't available on this device."));
            setMsg(t("Finding your location…"));
            navigator.geolocation.getCurrentPosition(
              (p) => {
                setMe({ lat: p.coords.latitude, lng: p.coords.longitude });
                setMsg(null);
              },
              () => setMsg(t("We couldn't get your location. Use the maps link instead.")),
              { timeout: 10000 },
            );
          }}
        >
          <LocateFixed className="size-5" aria-hidden />
          {t("Sort by distance from me")}
        </Button>
        <a href={mapsLink} target="_blank" rel="noopener noreferrer" className="tap inline-flex items-center gap-2 rounded-xl border border-field px-4 font-semibold hover:bg-surface-2">
          <Navigation className="size-5" aria-hidden />
          {t("All hospitals near me (maps)")}
        </a>
      </div>
      {msg ? <p role="status" className="text-fg-muted">{msg}</p> : null}
      <LazyMap points={list.map((h) => ({ lat: h.lat, lng: h.lng, title: h.name, subtitle: h.address, highlight: true }))} userLocation={me} height={280} label={t("Map of hospitals")} />
      <ul className="space-y-2">
        {list.map((h) => (
          <li key={h.name} className="card flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="font-semibold text-heading">{h.name}</p>
              <p className="flex items-center gap-1 text-sm text-fg-muted">
                <MapPin className="size-4" aria-hidden />
                {h.address}
                {h.d !== null ? ` · ${t("{km} km away", { km: h.d.toFixed(1) })}` : ""}
              </p>
              {h.emergency24x7 ? <p className="text-sm font-semibold text-success">{t("24×7 emergency department")}</p> : null}
            </div>
            <div className="flex gap-2">
              {h.phone ? (
                <a href={`tel:${h.phone.replace(/\s/g, "")}`} className="tap inline-flex items-center rounded-xl border border-field px-3 font-semibold">
                  {t("Call")}
                </a>
              ) : null}
              <a href={`https://www.google.com/maps/dir/?api=1&destination=${h.lat},${h.lng}`} target="_blank" rel="noopener noreferrer" className="tap inline-flex items-center rounded-xl bg-primary px-3 font-semibold text-on-primary">
                {t("Directions")}
              </a>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
