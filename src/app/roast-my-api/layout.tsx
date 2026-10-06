import type { ReactNode } from "react";
import type { Viewport } from "next";

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#140f0d" },
    { media: "(prefers-color-scheme: light)", color: "#fbf6f2" },
  ],
};

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
