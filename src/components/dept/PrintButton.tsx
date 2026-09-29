"use client";

import { useI18n } from "@/lib/i18n/provider";

/**
 * Prints the exhibit page as a case file. The page's own print styles do the
 * work -- the chrome, the controls and the comment box drop out, and what
 * remains is the record, its metadata and its notes.
 */
export function PrintButton() {
  const { t } = useI18n();
  return (
    <button type="button" onClick={() => window.print()} className="btn btn-ghost">
      <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
        <path d="M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z" />
      </svg>
      {t("file.print")}
    </button>
  );
}
