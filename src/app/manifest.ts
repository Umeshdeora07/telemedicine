import type { MetadataRoute } from "next";
import { brand } from "@/config/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${brand.name} — doctors online and in clinic`,
    short_name: brand.name,
    description: brand.tagline,
    start_url: "/dashboard?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F8FAFC",
    theme_color: "#0F766E",
    lang: "en-IN",
    categories: ["medical", "health"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
    shortcuts: [
      { name: "Consult now", url: "/consult-now", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "My consults", url: "/consults", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Emergency help", url: "/emergency", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
