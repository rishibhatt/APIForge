import type { Metadata } from "next";
import { Inter, Space_Mono } from "next/font/google";
import { AppThemeProvider } from "@/components/providers/AppThemeProvider";
import { LanguageProvider } from "@/context/LanguageContext";
import bodyStyles from "./layout.module.css";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600", "700", "800"],
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  variable: "--font-space-mono",
  weight: ["400", "700"],
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
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${spaceMono.variable} ${bodyStyles.body}`}
      >
        <AppThemeProvider>
          <LanguageProvider>{children}</LanguageProvider>
        </AppThemeProvider>
      </body>
    </html>
  );
}
