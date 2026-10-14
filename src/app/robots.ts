import type { MetadataRoute } from "next";
import { env } from "@/config/env";

export default function robots(): MetadataRoute.Robots {
  // Keep demo deployments out of search engines.
  if (env.demoMode) return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/dashboard", "/consults", "/consult/", "/records", "/prescriptions", "/family", "/settings", "/profile", "/doctor", "/clinic", "/coordinator", "/admin", "/share/", "/e/", "/join/", "/book/", "/pay/", "/login", "/onboarding", "/mfa"] }],
    sitemap: `${env.appUrl}/sitemap.xml`,
  };
}
