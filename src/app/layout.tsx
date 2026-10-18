import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_Devanagari, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { brand } from "@/config/brand";
import { env } from "@/config/env";
import { getI18n } from "@/i18n/server";
import { I18nProvider } from "@/i18n/client";
import { getPrefs, getViewerRegion, htmlClasses } from "@/lib/prefs";
import { getUser } from "@/server/auth/session";
import { ClientEffects } from "@/components/layout/client-effects";
import { CookieBanner } from "@/components/layout/cookie-banner";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap", weight: ["600", "700", "800"] });
// Loaded only when Hindi text is on the page (unicode-range subsets).
const deva = Noto_Sans_Devanagari({ subsets: ["devanagari"], variable: "--font-deva", display: "swap", preload: false, weight: ["400", "600", "700"] });

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    metadataBase: new URL(env.appUrl),
    title: { default: `${brand.name} | ${t("Online consultation with Indian specialists and treatment in India")}`, template: `%s | ${brand.name}` },
    description: t(
      "See a doctor registered in India by video, wherever you live. Or plan your treatment in India with a review of your reports by a specialist, a written cost estimate and help with your visa, travel and stay.",
    ),
    applicationName: brand.name,
    manifest: "/manifest.webmanifest",
    appleWebApp: { capable: true, title: brand.name, statusBarStyle: "default" },
    formatDetection: { telephone: false },
    icons: { icon: [{ url: "/icons/icon.svg", type: "image/svg+xml" }], apple: "/icons/apple-touch-icon.png" },
    robots: env.demoMode ? { index: false, follow: false } : undefined,
  };
}

/** The browser bar matches the header colour of the theme the visitor chose (light unless they switched). */
export async function generateViewport(): Promise<Viewport> {
  const { theme } = await getPrefs();
  return {
    width: "device-width",
    initialScale: 1,
    themeColor: theme === "dark" ? "#111b2e" : "#ffffff",
    colorScheme: theme,
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale, intl, dict, t } = await getI18n();
  const prefs = await getPrefs();
  const user = await getUser();
  const { tz, tzFromCookie } = await getViewerRegion(user);
  return (
    <html lang={locale} className={`${inter.variable} ${jakarta.variable} ${deva.variable} ${htmlClasses(prefs)}`} suppressHydrationWarning>
      <body className="min-h-dvh antialiased">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:start-3 focus:top-3 focus:z-[100] focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:font-semibold focus:shadow-lg">
          {t("Skip to main content")}
        </a>
        <I18nProvider value={{ locale, intl, dict, tz }}>
          {children}
          <CookieBanner />
          <ClientEffects serverTz={tz} hasTzCookie={tzFromCookie} />
        </I18nProvider>
      </body>
    </html>
  );
}
