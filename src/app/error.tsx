"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Seal } from "@/components/Seal";
import { useI18n } from "@/lib/i18n/provider";

/**
 * Error boundary for the platform routes -- the landing page, the directory,
 * /new and /account.
 *
 * It does not cover the root layout; a failure up there lands in
 * global-error.tsx instead, which has to bring its own <html> with it.
 */
export default function PlatformError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useI18n();

  useEffect(() => {
    // Vercel captures this; the digest is what ties it to a server-side trace.
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-lg flex-1 flex-col items-center justify-center px-4 py-16 text-center sm:py-24">
      <Seal size={90} className="mb-8 opacity-50" idPrefix="err" />

      <h1 className="stamp stamp-red mb-6 inline-block text-lg">
        {t("error.crashed")}
      </h1>

      <p className="mb-8 text-sm leading-relaxed text-ink-700">
        {t("error.crashedBody")}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-4">
        <button type="button" onClick={reset} className="btn btn-primary">
          {t("common.retry")}
        </button>
        <Link
          href="/"
          className="text-sm text-gov-800 underline underline-offset-4 hover:text-gov-600"
        >
          {t("nav.home")}
        </Link>
      </div>

      {/* Worth surfacing: it is the only string that lets somebody reporting
          the problem be matched to the server-side trace. */}
      {error.digest && (
        <p className="docket mt-10 text-3xs text-ink-400">
          {t("error.reference")} {error.digest}
        </p>
      )}
    </div>
  );
}
