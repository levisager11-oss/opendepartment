"use client";

import { useEffect } from "react";
import "./globals.css";

/**
 * Last resort: this replaces the root layout, so it is the only error screen
 * that has to bring its own <html> and <body>.
 *
 * Two things are deliberately absent. There is no i18n, because the provider
 * lives in the layout that just failed. And there are no next/font variables,
 * because those are applied by that same layout -- so --font-sans falls
 * through to its system-ui fallback, which is exactly what the token was
 * written to do.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-dvh flex-col">
        <div className="mx-auto flex max-w-lg flex-1 flex-col items-center justify-center px-4 py-24 text-center">
          <p className="stamp stamp-red mb-6 inline-block">
            Service interrupted
          </p>

          <p className="mb-8 text-sm leading-relaxed text-ink-700">
            OpenDepartment failed to start this page. Reloading usually clears
            it. No archive data is affected -- every department&rsquo;s files
            live in that department&rsquo;s own Supabase project.
          </p>

          <button type="button" onClick={reset} className="btn btn-primary">
            Reload
          </button>

          {error.digest && (
            <p className="docket mt-10 text-3xs text-ink-400">
              Reference {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
