import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { GeistMono } from "geist/font/mono";
import { LanguageProvider } from "@/context/LanguageContext";
import bodyStyles from "./layout.module.css";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  weight: ["400", "500", "600", "700", "800"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "ApiForge | Forge your API workspace",
  description:
    "Parse OpenAPI and Swagger specs, explore endpoints, and generate TypeScript, AI prompts, and API tests with Groq.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${plusJakarta.variable} ${inter.variable} ${GeistMono.variable} ${bodyStyles.body}`}
      >
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
