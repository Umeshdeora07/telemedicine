"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

export type MapPoint = { lat: number; lng: number; title: string; subtitle?: string; href?: string; highlight?: boolean };

/**
 * OpenStreetMap map with clinic markers (no API key). For production traffic,
 * use a commercial tile provider; OSM's public tiles have a usage policy.
 */
export function ClinicMap({ points, height = 360, label, userLocation }: { points: MapPoint[]; height?: number; label: string; userLocation?: { lat: number; lng: number } | null }) {
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let map: import("leaflet").Map | undefined;
    let cancelled = false;
    (async () => {
      const L = await import("leaflet");
      if (cancelled || !el.current) return;
      map = L.map(el.current, { scrollWheelZoom: false, attributionControl: true });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);
      const icon = (hl?: boolean) =>
        L.divIcon({
          className: "",
          html: `<span style="display:block;width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${hl ? "#dc2626" : "#0f766e"};border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.3)"></span>`,
          iconSize: [28, 28],
          iconAnchor: [14, 28],
        });
      const bounds: [number, number][] = [];
      for (const p of points) {
        const m = L.marker([p.lat, p.lng], { icon: icon(p.highlight), title: p.title, alt: p.title }).addTo(map);
        const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
        m.bindPopup(
          `<strong>${esc(p.title)}</strong>${p.subtitle ? `<br>${esc(p.subtitle)}` : ""}${p.href ? `<br><a href="${encodeURI(p.href)}">View</a>` : ""}`,
        );
        bounds.push([p.lat, p.lng]);
      }
      if (userLocation) {
        L.circleMarker([userLocation.lat, userLocation.lng], { radius: 8, color: "#0b2545", fillColor: "#3b82f6", fillOpacity: 0.9 }).addTo(map).bindPopup("You");
        bounds.push([userLocation.lat, userLocation.lng]);
      }
      if (bounds.length === 1) map.setView(bounds[0]!, 13);
      else if (bounds.length) map.fitBounds(bounds, { padding: [30, 30] });
      else map.setView([22.5, 79], 4);
    })();
    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [points, userLocation]);
  return <div ref={el} role="region" aria-label={label} style={{ height }} className="w-full overflow-hidden rounded-2xl border border-line bg-surface-2" />;
}
