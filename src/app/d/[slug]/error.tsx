"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useI18n } from "@/lib/i18n/provider";

/**
 * Error boundary for everything inside one department.
 *
 * Kept separate from the platform boundary because the likely cause is
 * different and so the honest message is different: out here a failure usually
 * means the *owner's* Supabase project did not answer or has no schema
 * installed, not that OpenDepartment is broken. Saying so is the difference
 * between a member filing a bug against us and telling their administrator.
 *
 * This renders inside the department layout, so the masthead and footer stay
 * on screen and the reader keeps their bearings.
 */
export default function DepartmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useI18n();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="stamp stamp-red mb-6 inline-block">{t("error.crashed")}</p>

      <p className="mb-8 text-sm leading-relaxed text-ink-700">
        {t("error.deptCrashedBody")}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-4">
        <button type="button" onClick={reset} className="btn btn-primary">
          {t("common.retry")}
        </button>
        <Link
          href="/directory"
          className="text-sm text-ink-700 underline underline-offset-4 hover:text-ink-900"
        >
          {t("od.directory")}
        </Link>
      </div>

      {error.digest && (
        <p className="docket mt-10 text-3xs text-ink-400">
          {t("error.reference")} {error.digest}
        </p>
      )}
    </div>
  );
}
