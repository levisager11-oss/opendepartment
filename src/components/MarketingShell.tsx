import Link from "next/link";
import { Wordmark } from "@/components/Logo";
import { T } from "@/components/T";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ThemeToggle } from "@/components/ThemeToggle";

/**
 * Header and footer for OpenDepartment's own pages.
 *
 * Kept separate from the department shell on purpose: this one talks about the
 * platform, has no session and no per-department accent.
 *
 * The landing page builds its own hero and so cannot use <MarketingShell>'s
 * centred <main>. It imports MarketingHeader and MarketingFooter directly
 * instead -- they used to be copy-pasted into it, and the two copies had
 * already drifted apart (one had a hover transition on the create button, one
 * did not, and the seals were different sizes).
 */
export function MarketingHeader() {
  return (
    <header className="masthead gov-rule sticky top-0 z-40">
      {/*
        `flex-wrap` is load-bearing below sm and inert above it. The wordmark,
        the language toggle and the call to action want about 465px between
        them -- "Departement erstellen" alone is 169px -- so on a 375px screen
        one of the three had to give. Wrapping is the option that hides
        nothing: the CTA drops to its own full-width row and everything stays
        reachable. From sm up the row has the space and nothing wraps.
      */}
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
        {/* Wordmark, links and toggle share one flex-1 row so they stay on one
            line at every width; left as loose siblings they wrapped
            independently, and below about 345px the toggle broke onto a line
            by itself. */}
        <div className="flex min-w-0 flex-1 items-center gap-6">
          <Link href="/" className="min-w-0 rounded-control">
            <Wordmark name={<T k="od.name" />} />
          </Link>
          <nav className="hidden items-center gap-1 text-sm font-medium text-ink-700 md:flex">
            <Link
              href="/directory"
              className="rounded-control px-3 py-2 transition-colors hover:bg-paper-200 hover:text-ink-900"
            >
              <T k="od.directory" />
            </Link>
            {/* A returning operator's way back to their departments used to
                be the last link in the footer. */}
            <Link
              href="/account"
              className="rounded-control px-3 py-2 transition-colors hover:bg-paper-200 hover:text-ink-900"
            >
              <T k="account.title" />
            </Link>
          </nav>
          <div className="ml-auto shrink-0">
            <LanguageToggle />
          </div>
        </div>
        {/* Kept outside that wrapper so it is this element that wraps. */}
        <Link href="/new" className="btn btn-primary w-full sm:w-auto">
          <T k="od.create" />
        </Link>
      </div>
    </header>
  );
}

const FOOTER_LINK =
  "inline-block py-1 text-ink-500 transition-colors hover:text-ink-900 sm:py-0.5";

export function MarketingFooter() {
  return (
    <footer className="gov-rule-top bg-paper-50">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-4 py-12 text-sm sm:grid-cols-4">
        <div className="col-span-2">
          <Link href="/" className="inline-block rounded-control">
            <Wordmark size={28} name={<T k="od.name" />} />
          </Link>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-ink-500">
            <T k="od.footerBlurb" />
          </p>
          <div className="mt-5">
            <ThemeToggle />
          </div>
        </div>

        <nav aria-labelledby="footer-product">
          <p id="footer-product" className="mb-3 font-semibold text-ink-900">
            <T k="od.footerProduct" />
          </p>
          <ul className="space-y-1.5">
            <li>
              <Link href="/new" className={FOOTER_LINK}>
                <T k="od.create" />
              </Link>
            </li>
            {/* The header hides this link below md, so without it here a
                phone had no route to the directory from any page but the
                landing hero. */}
            <li>
              <Link href="/directory" className={FOOTER_LINK}>
                <T k="od.directory" />
              </Link>
            </li>
            <li>
              <Link href="/account" className={FOOTER_LINK}>
                <T k="account.title" />
              </Link>
            </li>
          </ul>
        </nav>

        <nav aria-labelledby="footer-legal">
          <p id="footer-legal" className="mb-3 font-semibold text-ink-900">
            <T k="od.footerLegal" />
          </p>
          <ul className="space-y-1.5">
            <li>
              <Link href="/legal/terms" className={FOOTER_LINK}>
                <T k="legal.terms" />
              </Link>
            </li>
            <li>
              <Link href="/legal/privacy" className={FOOTER_LINK}>
                <T k="legal.privacy" />
              </Link>
            </li>
            <li>
              <Link href="/legal/imprint" className={FOOTER_LINK}>
                <T k="legal.imprint" />
              </Link>
            </li>
            <li>
              <Link href="/report" className={FOOTER_LINK}>
                <T k="abuse.link" />
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}

export function MarketingShell({
  children,
  wide,
}: {
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <>
      <MarketingHeader />
      <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
        <div className={`mx-auto px-4 py-10 sm:py-14 ${wide ? "max-w-5xl" : "max-w-3xl"}`}>
          {children}
        </div>
      </main>
      <MarketingFooter />
    </>
  );
}
