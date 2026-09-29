import Link from "next/link";
import { MarketingFooter, MarketingHeader } from "@/components/MarketingShell";
import { T } from "@/components/T";
import { privatePage } from "@/lib/seo";

export const metadata = privatePage("Page not found");

/**
 * The site-wide 404 -- and, less obviously, the one an unknown department slug
 * lands on. /d/[slug]/layout.tsx calls notFound() when it cannot resolve the
 * slug, and a layout's notFound passes its own segment's boundary, so this
 * page answers it rather than d/[slug]/not-found.tsx.
 *
 * That is why the directory link is here: after a mistyped or expired
 * department address, "browse the public ones" is the only useful next step.
 * And why it wears the platform's own header and footer rather than any
 * department's: there is no department here to borrow a seal from.
 */
export default function NotFound() {
  return (
    <>
      <MarketingHeader />
      <main id="main" tabIndex={-1} className="flex flex-1 flex-col focus:outline-none">
        <div className="mx-auto flex max-w-lg flex-1 flex-col items-center justify-center px-4 py-20 text-center sm:py-28">
          {/* The stamp is the page's heading, not decoration -- Tailwind's
              preflight resets heading size and weight, so the .stamp utility
              still renders it identically. */}
          <h1 className="stamp stamp-red mb-6 inline-block text-lg">404</h1>

          <p className="mb-8 text-base leading-relaxed text-ink-700">
            <T k="error.notFound" />
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/directory" className="btn btn-primary">
              <T k="od.directory" />
            </Link>
            <Link href="/" className="btn btn-ghost">
              <T k="nav.home" />
            </Link>
          </div>
        </div>
      </main>
      <MarketingFooter />
    </>
  );
}
