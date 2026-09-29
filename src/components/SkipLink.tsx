"use client";

import { useI18n } from "@/lib/i18n/provider";

/**
 * The first stop for a keyboard. Both shells open with a banner, a masthead
 * and a navigation row, so reaching a page's first control used to take up to
 * nine presses of Tab on every page load. Invisible until focused.
 *
 * Every shell's <main> carries id="main" and tabIndex={-1}: the id is what
 * this points at, and the tabIndex is what lets Safari move focus there
 * rather than only scrolling.
 */
export function SkipLink() {
  const { t } = useI18n();
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-card focus:bg-paper-50 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-gov-900 focus:shadow-lg"
    >
      {t("nav.skip")}
    </a>
  );
}
