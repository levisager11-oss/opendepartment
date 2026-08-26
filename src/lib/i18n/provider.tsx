"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  translate,
  type Locale,
  type TranslationKey,
} from "./dictionary";
import { LOCALE_COOKIE } from "./constants";

type I18nValue = {
  locale: Locale;
  setLocale: (next: Locale) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
  /** Simple singular/plural helper: key must have _one / _other variants. */
  plural: (base: string, n: number) => string;
  formatDate: (iso: string) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

export { LOCALE_COOKIE };

export function I18nProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    // One year, lax: remembered across visits, sent on top-level navigation.
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.lang = next;
  }, []);

  const value = useMemo<I18nValue>(
    () => ({
      locale,
      setLocale,
      t: (key, vars) => translate(locale, key, vars),
      plural: (base, n) =>
        translate(
          locale,
          `${base}_${n === 1 ? "one" : "other"}` as TranslationKey,
          { n }
        ),
      formatDate: (iso) =>
        new Date(iso).toLocaleDateString(locale === "de" ? "de-CH" : "en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
    }),
    [locale, setLocale]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}
