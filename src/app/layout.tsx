import type { Metadata, Viewport } from "next";
import { Fraunces } from "next/font/google";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { AnalyticsHead, ThemeHead } from "@/components/layout/AnalyticsHead";
import { ConsentBanner } from "@/components/layout/ConsentBanner";
import { UnitProvider } from "@/components/calc/units-context";
import { OwnerMarker } from "@/components/layout/OwnerMarker";
import { JsonLd } from "@/components/page/blocks";
import { organizationLd, websiteLd } from "@/lib/seo";
import { INDEXABLE, SITE } from "@/lib/site";
import "./globals.css";

// Headings: no SOFT axis (smaller file) and display "optional" so a slow font never delays LCP
// or swaps layout — the size-adjusted fallback stands in on a cold first visit.
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "optional",
  axes: ["opsz"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `${SITE.name} — Home Project & Energy Cost Calculators`, template: `%s | ${SITE.name}` },
  description: SITE.description,
  applicationName: SITE.name,
  robots: INDEXABLE ? { index: true, follow: true } : { index: false, follow: false },
  formatDetection: { telephone: false, address: false, email: false },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-icon.png",
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f2ee" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0c0f" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={fraunces.variable} suppressHydrationWarning>
      <head>
        <ThemeHead />
        <AnalyticsHead />
      </head>
      <body className="flex min-h-dvh flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-bg"
        >
          Skip to content
        </a>
        <UnitProvider>
          <Header />
          <main id="main" className="flex-1">
            {children}
          </main>
          <Footer />
        </UnitProvider>
        <ConsentBanner />
        <OwnerMarker />
        <JsonLd data={[organizationLd(), websiteLd()]} />
      </body>
    </html>
  );
}
