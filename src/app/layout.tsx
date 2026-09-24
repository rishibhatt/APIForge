import Script from "next/script";
import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { AppThemeProvider } from "@/components/providers/AppThemeProvider";
import { LanguageProvider } from "@/context/LanguageContext";
import bodyStyles from "./layout.module.css";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  weight: ["400", "500", "600", "700"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://apiforge.info";
const gaId = process.env.NEXT_PUBLIC_GA_ID || "G-E9R9NSFZVR";

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0c0814" },
    { media: "(prefers-color-scheme: light)", color: "#f5f3f8" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "APIForge — The Intelligent OpenAPI & Swagger Workspace",
    template: "%s | APIForge",
  },
  description:
    "Transform OpenAPI & Swagger specs into interactive API explorers, TypeScript SDKs, automated test suites, and AI-powered quality audits. Test live APIs with zero CORS blockers.",
  applicationName: "APIForge",
  authors: [{ name: "Rishi Bhatt", url: "https://github.com/rishibhatt" }],
  creator: "Rishi Bhatt",
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
    "API Mock Server",
    "AI Schema Auto-Fix",
    "CORS Proxy",
    "REST API Tools",
    "API Testing",
    "Developer Tools",
    "Groq AI",
  ],
  category: "Developer Tools",
  alternates: {
    canonical: "/",
  },
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
    title: "APIForge — The Intelligent OpenAPI & Swagger Workspace",
    description:
      "Transform OpenAPI & Swagger specs into interactive API explorers, TypeScript SDKs, automated test suites, and AI-powered quality audits. Test live APIs with zero CORS blockers.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "APIForge — The Intelligent OpenAPI & Swagger Workspace",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "APIForge — The Intelligent OpenAPI & Swagger Workspace",
    description:
      "Transform OpenAPI & Swagger specs into interactive API explorers, TypeScript SDKs, automated test suites, and AI-powered quality audits. Test live APIs with zero CORS blockers.",
    creator: "@rishibhatt",
    site: "@rishibhatt",
    images: [
      {
        url: "/twitter-image",
        width: 1200,
        height: 630,
        alt: "APIForge — The Intelligent OpenAPI & Swagger Workspace",
      },
    ],
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icon.png", sizes: "180x180", type: "image/png" }],
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
      className={`${plusJakarta.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        {/* Google Analytics (gtag.js) */}
        <Script
          async
          src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
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
        <AppThemeProvider>
          <LanguageProvider>{children}</LanguageProvider>
        </AppThemeProvider>
      </body>
    </html>
  );
}
