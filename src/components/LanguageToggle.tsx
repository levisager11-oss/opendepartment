"use client";

import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/provider";
import type { Locale } from "@/lib/i18n/dictionary";

export function LanguageToggle({ light = false }: { light?: boolean }) {
  const { locale, setLocale, t } = useI18n();
  const router = useRouter();

  function pick(next: Locale) {
    if (next === locale) return;
    setLocale(next);
    // Server components (legal pages, headers) re-render in the new language.
    router.refresh();
  }

  const base = light
    ? "text-gov-100/70 hover:text-white"
    : "text-ink-500 hover:text-gov-800";
  const active = light ? "text-white font-bold" : "text-gov-800 font-bold";

  return (
    <div
      className="flex items-center gap-1 text-xs tracking-wider"
      role="group"
      aria-label={t("nav.language")}
    >
      {(["de", "en"] as Locale[]).map((code, i) => (
        <span key={code} className="flex items-center gap-1">
          {i > 0 && (
            <span className={light ? "text-gov-100/30" : "text-paper-400"}>
              |
            </span>
          )}
          <button
            type="button"
            onClick={() => pick(code)}
            aria-current={locale === code ? "true" : undefined}
            className={`uppercase transition-colors cursor-pointer ${
              locale === code ? active : base
            }`}
          >
            {code}
          </button>
        </span>
      ))}
    </div>
  );
}
