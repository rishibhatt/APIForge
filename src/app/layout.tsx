import Script from "next/script";
import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import localFont from "next/font/local";
import { AppThemeProvider } from "@/components/providers/AppThemeProvider";
import { LanguageProvider } from "@/context/LanguageContext";
import { PostHogProvider } from "@/components/providers/PostHogProvider";
import { ZoneController } from "@/components/providers/ZoneController";
import { RoastTransition } from "@/components/providers/RoastTransition/RoastTransition";
import { Toaster } from "@/components/providers/Toaster/Toaster";
import GlobalSupport from "@/components/atomic/organisms/SupportFab/GlobalSupport";
import { MicrosoftClarity } from "@/components/analytics/MicrosoftClarity";
import bodyStyles from "./layout.module.css";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

/** Self-hosted Material Symbols subset (see scripts/sync-icon-font.mjs). */
const iconFont = localFont({
  src: "./fonts/material-symbols.woff2",
  variable: "--font-icons",
  display: "block",
  preload: true,
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://apiforge.info";
const gaId = process.env.NEXT_PUBLIC_GA_ID || "G-E9R9NSFZVR";

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#131315" },
    { media: "(prefers-color-scheme: light)", color: "#f7f5fa" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "APIForge: Free OpenAPI & Swagger Validator, API Tester and Quality Score",
    template: "%s | APIForge",
  },
  description:
    "Free online OpenAPI and Swagger tool. Parse a spec URL, send requests without CORS errors, validate responses against the schema, score API design 0 to 100, and generate TypeScript types and tests. No sign-up.",
  applicationName: "APIForge",
  authors: [{ name: "Rishab Bhatt", url: "https://github.com/rishibhatt" }],
  creator: "Rishab Bhatt",
  publisher: "APIForge",
  keywords: [
    "OpenAPI",
    "Swagger",
    "OpenAPI 3.0",
    "Swagger 2.0",
    "Swagger Parser",
    "API Quality Score",
    "API Linter",
    "TypeScript SDK Generator",
        "AI Schema Auto-Fix",
    "CORS Proxy",
    "REST API Tools",
    "API Testing",
    "Developer Tools",
    "Groq AI",
  ],
  category: "Developer Tools",
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "APIForge",
    title: "APIForge: Free OpenAPI & Swagger Validator, API Tester and Quality Score",
    description:
      "Free online OpenAPI and Swagger tool. Parse a spec URL, send requests without CORS errors, validate responses against the schema, score API design 0 to 100, and generate TypeScript types and tests. No sign-up.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "APIForge: Free OpenAPI & Swagger Validator, API Tester and Quality Score",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "APIForge: Free OpenAPI & Swagger Validator, API Tester and Quality Score",
    description:
      "Free online OpenAPI and Swagger tool. Parse a spec URL, send requests without CORS errors, validate responses against the schema, score API design 0 to 100, and generate TypeScript types and tests. No sign-up.",
    creator: "@Rishi_o07",
    site: "@Rishi_o07",
    images: [
      {
        url: "/twitter-image",
        width: 1200,
        height: 630,
        alt: "APIForge: Free OpenAPI & Swagger Validator, API Tester and Quality Score",
      },
    ],
  },
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${jakarta.variable} ${jetbrains.variable} ${iconFont.variable}`}
    >
      <head>
        {/* Google Analytics (gtag.js) */}
        <Script
          async
          src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
          strategy="lazyOnload"
        />
        <Script id="google-analytics" strategy="lazyOnload">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', '${gaId}', {
              page_path: window.location.pathname,
            });
          `}
        </Script>
      </head>
      <body className={bodyStyles.body}>
        <PostHogProvider>
          <AppThemeProvider>
            <LanguageProvider>
              <ZoneController />
              {children}
              <GlobalSupport />
              <RoastTransition />
              <Toaster />
            </LanguageProvider>
          </AppThemeProvider>
        </PostHogProvider>
        <MicrosoftClarity />
      </body>
    </html>
  );
}
