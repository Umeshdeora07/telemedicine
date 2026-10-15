import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_Arabic, Noto_Sans_Devanagari, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { brand } from "@/config/brand";
import { env } from "@/config/env";
import { getI18n } from "@/i18n/server";
import { I18nProvider } from "@/i18n/client";
import { getPrefs, getViewerRegion, htmlClasses } from "@/lib/prefs";
import { getUser } from "@/server/auth/session";
import { InlineScript, THEME_SCRIPT } from "@/components/layout/inline-script";
import { ClientEffects } from "@/components/layout/client-effects";
import { CookieBanner } from "@/components/layout/cookie-banner";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap", weight: ["600", "700", "800"] });
// Loaded only when Hindi or Arabic text is on the page (unicode-range subsets).
const deva = Noto_Sans_Devanagari({ subsets: ["devanagari"], variable: "--font-deva", display: "swap", preload: false, weight: ["400", "600", "700"] });
const arabic = Noto_Sans_Arabic({ subsets: ["arabic"], variable: "--font-arabic", display: "swap", preload: false, weight: ["400", "600", "700"] });

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    metadataBase: new URL(env.appUrl),
    title: { default: `${brand.name} — ${t("Consult verified doctors online and in clinic")}`, template: `%s · ${brand.name}` },
    description: t(
      "Video, audio or chat consults with verified doctors, e-prescriptions, and clinic visits when you need them. Book for yourself or your family in India, from anywhere.",
    ),
    applicationName: brand.name,
    manifest: "/manifest.webmanifest",
    appleWebApp: { capable: true, title: brand.name, statusBarStyle: "default" },
    formatDetection: { telephone: false },
    icons: { icon: [{ url: "/icons/icon.svg", type: "image/svg+xml" }], apple: "/icons/apple-touch-icon.png" },
    robots: env.demoMode ? { index: false, follow: false } : undefined,
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1220" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale, dir, intl, dict, t } = await getI18n();
  const prefs = await getPrefs();
  const user = await getUser();
  const { tz, tzFromCookie } = await getViewerRegion(user);
  return (
    <html
      lang={locale}
      dir={dir}
      className={`${inter.variable} ${jakarta.variable} ${deva.variable} ${arabic.variable} ${htmlClasses(prefs)}`}
      suppressHydrationWarning
    >
      <head>{prefs.theme === "system" ? <InlineScript html={THEME_SCRIPT} /> : null}</head>
      <body className="min-h-dvh antialiased">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:start-3 focus:top-3 focus:z-[100] focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:font-semibold focus:shadow-lg">
          {t("Skip to main content")}
        </a>
        <I18nProvider value={{ locale, dir, intl, dict, tz }}>
          {children}
          <CookieBanner />
          <ClientEffects serverTz={tz} hasTzCookie={tzFromCookie} />
        </I18nProvider>
      </body>
    </html>
  );
}
