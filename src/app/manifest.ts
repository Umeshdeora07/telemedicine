import type { MetadataRoute } from "next";
import { brand } from "@/config/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${brand.name}: Indian doctors online and treatment in India`,
    short_name: brand.name,
    description: "See a doctor registered in India by video, wherever you live, or plan your treatment in India.",
    start_url: "/dashboard?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FFFFFF",
    theme_color: "#1D4ED8",
    lang: "en-IN",
    categories: ["medical", "health"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
    shortcuts: [
      { name: "Book a consultation", url: "/doctors", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "My consultations", url: "/consults", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "My treatment plans", url: "/international/cases", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
