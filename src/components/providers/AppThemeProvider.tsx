"use client";

import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";

const STORAGE_KEY = "apiforge-theme";

export function AppThemeProvider({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      storageKey={STORAGE_KEY}
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  );
}
