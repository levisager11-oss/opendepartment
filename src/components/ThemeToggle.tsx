"use client";

import { useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { THEME_COOKIE, isTheme, type ThemeChoice } from "@/lib/theme";

const ICONS: Record<ThemeChoice, string> = {
  system: "M3 5h18v11H3z M8 20h8 M12 16v4",
  light:
    "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M12 2.5v2 M12 19.5v2 M2.5 12h2 M19.5 12h2 M5.3 5.3l1.4 1.4 M17.3 17.3l1.4 1.4 M5.3 18.7l1.4-1.4 M17.3 6.7l1.4-1.4",
  dark: "M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z",
};

const LABELS = {
  system: "theme.system",
  light: "theme.light",
  dark: "theme.dark",
} as const;

/**
 * The page's own record of the choice is the attribute on <html>, which the
 * server wrote from the cookie. Reading it back from there rather than keeping
 * a copy in state means there is one source of truth, and a switch in one
 * footer shows in the other at once.
 */
const listeners = new Set<() => void>();
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
function current(): ThemeChoice {
  const value = document.documentElement.dataset.theme;
  return isTheme(value) ? value : "system";
}

/**
 * System, light or dark. "System" is the default and stores nothing: the
 * stylesheet follows prefers-color-scheme by itself. A choice is applied to
 * the page at once and kept in a cookie so the server can render the next page
 * in it without a flash.
 */
export function ThemeToggle() {
  const { t } = useI18n();
  const router = useRouter();
  // The server does not know which it is until it has the cookie, and says
  // "system" while hydrating; the real value follows straight after.
  const choice = useSyncExternalStore(subscribe, current, () => "system" as const);

  function pick(next: ThemeChoice) {
    if (next === choice) return;
    const root = document.documentElement;
    if (next === "system") {
      delete root.dataset.theme;
      document.cookie = `${THEME_COOKIE}=; path=/; max-age=0; samesite=lax`;
    } else {
      root.dataset.theme = next;
      document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    }
    listeners.forEach((listener) => listener());
    // The colours have already changed; this only brings the browser's own
    // chrome colour (the theme-color meta tag) along with them.
    router.refresh();
  }

  return (
    <div
      role="group"
      aria-label={t("theme.label")}
      className="inline-flex items-center rounded-control border border-paper-300 bg-paper-100 p-0.5"
    >
      {(["system", "light", "dark"] as const).map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => pick(option)}
          aria-pressed={choice === option}
          aria-label={t(LABELS[option])}
          title={t(LABELS[option])}
          // 32px square: the same target as the language toggle beside it.
          className={`flex size-8 cursor-pointer items-center justify-center rounded-tag transition-colors ${
            choice === option
              ? "bg-paper-50 text-ink-900 shadow-sm"
              : "text-ink-500 hover:text-ink-900"
          }`}
        >
          <svg
            aria-hidden
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d={ICONS[option]} />
          </svg>
        </button>
      ))}
    </div>
  );
}
