"use client";

import {
  createContext,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import en from "@/locales/en.json";

export type TranslationVars = Record<string, string | number>;

export type TranslateFn = (
  key: string,
  vars?: TranslationVars,
) => string;

function getNested(
  obj: Record<string, unknown>,
  path: string,
): string | undefined {
  const value = path.split(".").reduce<unknown>((acc, part) => {
    if (acc && typeof acc === "object" && part in acc) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj);
  return typeof value === "string" ? value : undefined;
}

export const LanguageContext = createContext<{
  t: TranslateFn;
  language: string;
} | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const dictionary = en as Record<string, unknown>;

  const t = useCallback(
    (key: string, vars?: TranslationVars) => {
      const raw = getNested(dictionary, key);
      if (typeof raw !== "string") return key;
      if (!vars) return raw;
      return Object.entries(vars).reduce(
        (acc, [k, v]) => acc.replaceAll(`{${k}}`, String(v)),
        raw,
      );
    },
    [dictionary],
  );

  const value = useMemo(
    () => ({ t, language: "en" as const }),
    [t],
  );

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}
