"use client";

import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/provider";
import type { Locale } from "@/lib/i18n/dictionary";

/**
 * A two-way segmented control. Every header it sits in is light now, so it no
 * longer has a variant for a dark one.
 */
export function LanguageToggle() {
  const { locale, setLocale, t } = useI18n();
  const router = useRouter();

  function pick(next: Locale) {
    if (next === locale) return;
    setLocale(next);
    // Server components (legal pages, headers) re-render in the new language.
    router.refresh();
  }

  return (
    <div
      className="flex items-center rounded-full border border-paper-300 bg-paper-100 p-0.5 text-xs font-semibold"
      role="group"
      aria-label={t("nav.language")}
    >
      {(["de", "en"] as Locale[]).map((code) => (
        // Each half is at least 28x32 -- two uppercase letters alone were a
        // 15x16px target, under half of what a thumb can reliably hit.
        <button
          key={code}
          type="button"
          onClick={() => pick(code)}
          aria-current={locale === code ? "true" : undefined}
          className={`min-w-8 cursor-pointer rounded-full px-2 py-1.5 uppercase transition-colors sm:py-1 ${
            locale === code
              ? "bg-paper-50 text-ink-900 shadow-sm"
              : "text-ink-500 hover:text-ink-900"
          }`}
        >
          {code}
        </button>
      ))}
    </div>
  );
}
