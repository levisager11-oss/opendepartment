"use client";

import Link from "next/link";
import { useEffect } from "react";
import { MarketingFooter, MarketingHeader } from "@/components/MarketingShell";
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
    <>
      <MarketingHeader />
      <main id="main" tabIndex={-1} className="flex flex-1 flex-col focus:outline-none">
        <div className="mx-auto flex max-w-lg flex-1 flex-col items-center justify-center px-4 py-20 text-center sm:py-28">
          <h1 className="stamp stamp-red mb-6 inline-block text-lg">
            {t("error.crashed")}
          </h1>

          <p className="mb-8 text-sm leading-relaxed text-ink-700">
            {t("error.crashedBody")}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button type="button" onClick={reset} className="btn btn-primary">
              {t("common.retry")}
            </button>
            <Link href="/" className="btn btn-ghost">
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
      </main>
      <MarketingFooter />
    </>
  );
}
