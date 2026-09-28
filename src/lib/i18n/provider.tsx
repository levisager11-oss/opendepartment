"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
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
  /**
   * Dates are rendered on the server first, in the server's time zone (UTC on
   * Vercel), and then hydrated in the reader's -- and a timestamp with hours
   * and minutes in it is a different string in Zurich than in UTC. That is a
   * hydration mismatch on every comment, every exhibit's "filed on" line and
   * every admin list, for anybody not sitting in UTC.
   *
   * So the first pass formats in UTC on both sides, which is guaranteed to
   * agree, and the pass after hydration switches to the reader's own zone.
   */
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

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
          ...(hydrated ? {} : { timeZone: "UTC" }),
        }),
    }),
    [locale, setLocale, hydrated]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}
