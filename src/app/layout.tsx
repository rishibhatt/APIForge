import type { Metadata } from "next";
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
    <html
      lang="en"
      suppressHydrationWarning
      className={`${plusJakarta.variable} ${jetbrainsMono.variable}`}
    >
      <body className={bodyStyles.body}>
        <AppThemeProvider>
          <LanguageProvider>{children}</LanguageProvider>
        </AppThemeProvider>
      </body>
    </html>
  );
}
